import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import {
  buildCowatchEmbedUrl,
  classifyDrift,
  createProviderCommand,
  estimateClientTime,
  getPlaybackActionMode,
  parseProviderMessage,
  providerAdapters,
  shouldForwardProviderEvent,
} from "../../services/cowatch/player-adapters";
import {
  applyObservedPlayerEvent,
  buildHostTimelineReport,
  consumeExpectedProviderEcho,
  derivePlayerSyncState,
  hasPendingExpectedPlaybackEcho,
  initialObservedPlaybackState,
  queueExpectedProviderEcho,
  type ExpectedProviderEcho,
  type ObservedPlaybackState,
  type PlayerLoadState,
} from "../../services/cowatch/player-state";
import type {
  CowatchMedia,
  CowatchPlayback,
  CowatchPlaybackRequest,
  CowatchPlayerEvent,
} from "../../services/cowatch/types";
import { colors } from "../../theme/colors";

type Props = {
  media: CowatchMedia | null;
  playback: CowatchPlayback;
  participantId: string;
  isHost: boolean;
  syncIntervalMs: number;
  driftToleranceSeconds: number;
  resyncKey: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onPlay: (request: CowatchPlaybackRequest) => void;
  onPause: (request: CowatchPlaybackRequest) => void;
  onSeek: (currentTime: number, request: CowatchPlaybackRequest) => void;
  onTimeline: (currentTime: number, playing: boolean) => void;
  onChangeMediaPress?: () => void;
  unreadChatCount?: number;
  onOpenChat?: () => void;
  chatToast?: { id: string; senderName: string; text: string } | null;
  onDismissChatToast?: () => void;
  onResync?: () => void;
  microphoneEnabled?: boolean;
  cameraEnabled?: boolean;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
};

const DIRECT_RETRY_DELAYS_MS = [200, 400, 800] as const;
const EXPECTED_ECHO_TTL_MS = 3000;
const FAST_CONVERGENCE_DURATION_MS = 5000;

const INJECTED_BRIDGE_JS = `
(function() {
  if (window.__lauratv_bridge_installed) return;
  window.__lauratv_bridge_installed = true;

  // 1. Forward all window messages (from provider embed iframes/players) to React Native
  window.addEventListener('message', function(event) {
    try {
      if (window.ReactNativeWebView && event.data) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          source: 'window_message',
          origin: event.origin || '',
          data: event.data
        }));
      }
    } catch(e) {}
  });

  // 2. Also listen for HTML5 video element events if present on page
  function attachVideoListeners() {
    try {
      var videos = document.querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) {
        var v = videos[i];
        if (v._cowatchAttached) continue;
        v._cowatchAttached = true;
        v.addEventListener('play', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              source: 'video_event',
              event: 'play',
              currentTime: this.currentTime
            }));
          }
        });
        v.addEventListener('pause', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              source: 'video_event',
              event: 'pause',
              currentTime: this.currentTime
            }));
          }
        });
        v.addEventListener('timeupdate', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              source: 'video_event',
              event: 'timeupdate',
              currentTime: this.currentTime
            }));
          }
        });
        v.addEventListener('seeked', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              source: 'video_event',
              event: 'seeked',
              currentTime: this.currentTime
            }));
          }
        });
      }
    } catch(e) {}
  }

  attachVideoListeners();
  setInterval(attachVideoListeners, 1000);
})();
true;
`;

export function CowatchPlayer({
  media,
  playback,
  participantId,
  isHost,
  syncIntervalMs,
  driftToleranceSeconds,
  resyncKey,
  isFullscreen,
  onToggleFullscreen,
  onPlay,
  onPause,
  onSeek,
  onTimeline,
  onChangeMediaPress,
  unreadChatCount = 0,
  onOpenChat,
  chatToast,
  onDismissChatToast,
  onResync,
  microphoneEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCam,
}: Props) {
  const [embedUrl, setEmbedUrl] = useState<string | undefined>(() =>
    media ? buildCowatchEmbedUrl(media, playback) : undefined,
  );
  const [webKey, setWebKey] = useState(0);
  const [loadState, setLoadState] = useState<PlayerLoadState>(
    media ? "loading" : "idle",
  );
  const [observedPlayback, setObservedPlayback] = useState<ObservedPlaybackState>(
    initialObservedPlaybackState,
  );
  const [correctionExhausted, setCorrectionExhausted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = isFullscreen || windowWidth > windowHeight;

  const webViewRef = useRef<WebView>(null);
  const observedPlaybackRef = useRef(observedPlayback);
  const correctionAtRef = useRef(0);
  const correctionAttemptsRef = useRef(0);
  const expectedEchoesRef = useRef<ExpectedProviderEcho[]>([]);
  const locallyAppliedActionIdsRef = useRef(new Set<string>());
  const processedActionIdRef = useRef<string | undefined>(undefined);
  const latestMediaRef = useRef(media);
  const latestPlaybackRef = useRef(playback);
  const directRetryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const directEventObservedRef = useRef(false);
  const lastResyncKeyRef = useRef(resyncKey);
  const lastMediaKeyRef = useRef("");
  const fastConvergenceUntilRef = useRef(Date.now() + FAST_CONVERGENCE_DURATION_MS);
  const prevIsFullscreenRef = useRef(isFullscreen);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mediaKey = media
    ? `${media.type}:${media.id}:${media.season ?? ""}:${media.episode ?? ""}:${media.providerId}`
    : "";
  const providerId = media?.providerId;
  const capabilities = providerId ? providerAdapters[providerId] : undefined;

  // Development Mount/Unmount Logging
  useEffect(() => {
    if (__DEV__) {
      console.log("[CowatchPlayer] MOUNTED. Player session initialized.");
    }
    return () => {
      if (__DEV__) {
        console.log("[CowatchPlayer] UNMOUNTED. Player destroyed.");
      }
    };
  }, []);

  // Auto-hide controls overlay in fullscreen mode after inactivity
  const showOverlayTemporarily = useCallback(() => {
    setOverlayVisible(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (isFullscreen) {
      overlayTimerRef.current = setTimeout(() => {
        setOverlayVisible(false);
      }, 4000);
    }
  }, [isFullscreen]);

  useEffect(() => {
    showOverlayTemporarily();
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [isFullscreen, showOverlayTemporarily]);

  // Fast convergence activation on fullscreen transition
  useEffect(() => {
    if (prevIsFullscreenRef.current !== isFullscreen) {
      fastConvergenceUntilRef.current = Date.now() + FAST_CONVERGENCE_DURATION_MS;
      if (__DEV__) {
        console.log(
          `[CowatchSync] Fullscreen transitioned (${prevIsFullscreenRef.current ? "landscape" : "portrait"} -> ${isFullscreen ? "landscape" : "portrait"}). Fast convergence window active (5s).`,
        );
      }
    }
    prevIsFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  const rememberExpectedEcho = useCallback(
    (event: Pick<ExpectedProviderEcho, "actionId" | "type" | "currentTime">) => {
      const now = Date.now();
      expectedEchoesRef.current = queueExpectedProviderEcho(
        expectedEchoesRef.current,
        {
          ...event,
          expiresAt: now + EXPECTED_ECHO_TTL_MS,
        },
        now,
      );
    },
    [],
  );

  const stopDirectConvergence = useCallback(() => {
    if (directRetryTimerRef.current !== undefined) {
      clearTimeout(directRetryTimerRef.current);
      directRetryTimerRef.current = undefined;
    }
  }, []);

  // Discrete Immediate Command Dispatch for Fast Reactions
  const dispatchDiscreteCommand = useCallback(
    (action: "play" | "pause" | "seek", targetTime?: number) => {
      const currentMedia = latestMediaRef.current;
      if (
        !currentMedia ||
        !webViewRef.current ||
        !providerAdapters[currentMedia.providerId]?.canReceiveDirectCommands
      ) {
        return;
      }

      const receivedAt = Date.now();
      const latencyMs =
        latestPlaybackRef.current.updatedAt > 0
          ? receivedAt - latestPlaybackRef.current.updatedAt
          : 0;

      if (__DEV__) {
        console.log(
          `[CowatchCommand] type=${action} receivedAt=${receivedAt} targetTime=${targetTime?.toFixed(2)} latencyMs=${latencyMs}`,
        );
      }

      const cmds: any[] = [];
      if (action === "pause") {
        const pauseCmd = createProviderCommand(currentMedia.providerId, {
          command: "pause",
        });
        if (pauseCmd) cmds.push(pauseCmd.message);
      } else if (action === "play") {
        const playCmd = createProviderCommand(currentMedia.providerId, {
          command: "play",
        });
        if (playCmd) cmds.push(playCmd.message);
      } else if (action === "seek" && targetTime !== undefined) {
        const seekCmd = createProviderCommand(currentMedia.providerId, {
          command: "seek",
          value: targetTime,
        });
        if (seekCmd) cmds.push(seekCmd.message);
      }

      if (cmds.length > 0) {
        const js = `
          (function() {
            try {
              var cmds = ${JSON.stringify(cmds)};
              cmds.forEach(function(cmd) {
                window.postMessage(cmd, '*');
                document.querySelectorAll('iframe').forEach(function(f) {
                  try { f.contentWindow.postMessage(cmd, '*'); } catch(e) {}
                });
              });
            } catch(e) {}
          })();
          true;
        `;
        webViewRef.current.injectJavaScript(js);
      }
    },
    [],
  );

  const startDirectConvergence = useCallback(() => {
    stopDirectConvergence();
    let attemptIndex = 0;
    const applyLatestState = () => {
      const currentMedia = latestMediaRef.current;
      const currentPlayback = latestPlaybackRef.current;
      if (
        !currentMedia ||
        !webViewRef.current ||
        !providerAdapters[currentMedia.providerId]?.canReceiveDirectCommands
      ) {
        return;
      }

      const actionId =
        currentPlayback.actionId ?? `converge:${currentPlayback.updatedAt}`;
      // Adaptive compensation for Android bridge + decode delay
      const currentTime = estimateClientTime(currentPlayback, Date.now(), true);
      rememberExpectedEcho({ actionId, type: "seek", currentTime });
      rememberExpectedEcho({
        actionId,
        type: currentPlayback.playing ? "play" : "pause",
      });

      const seekCmd = createProviderCommand(currentMedia.providerId, {
        command: "seek",
        value: currentTime,
      });
      const playCmd = createProviderCommand(currentMedia.providerId, {
        command: currentPlayback.playing ? "play" : "pause",
      });

      const js = `
        (function() {
          try {
            var cmds = [${seekCmd ? JSON.stringify(seekCmd.message) : "null"}, ${playCmd ? JSON.stringify(playCmd.message) : "null"}].filter(Boolean);
            cmds.forEach(function(cmd) {
              window.postMessage(cmd, '*');
              document.querySelectorAll('iframe').forEach(function(f) {
                try { f.contentWindow.postMessage(cmd, '*'); } catch(e) {}
              });
            });
          } catch(e) {}
        })();
        true;
      `;
      webViewRef.current.injectJavaScript(js);

      const delay = DIRECT_RETRY_DELAYS_MS[attemptIndex];
      attemptIndex += 1;
      if (delay !== undefined) {
        directRetryTimerRef.current = setTimeout(applyLatestState, delay);
      } else {
        directRetryTimerRef.current = undefined;
      }
    };
    applyLatestState();
  }, [rememberExpectedEcho, stopDirectConvergence]);

  const loadProvider = useCallback(
    (
      currentMedia: CowatchMedia,
      currentPlayback: CowatchPlayback,
      forceRemount: boolean,
      actionId?: string,
    ) => {
      const targetTime = estimateClientTime(currentPlayback, Date.now(), false);
      if (actionId) {
        rememberExpectedEcho({
          actionId,
          type: currentPlayback.playing ? "play" : "pause",
        });
        rememberExpectedEcho({
          actionId,
          type: "seek",
          currentTime: targetTime,
        });
      }
      const nextUrl = buildCowatchEmbedUrl(currentMedia, currentPlayback);
      setEmbedUrl(nextUrl);
      if (forceRemount) {
        setWebKey((prev) => prev + 1);
      }
      setLoadState("loading");
    },
    [rememberExpectedEcho],
  );

  useEffect(() => {
    latestMediaRef.current = media;
    latestPlaybackRef.current = playback;
  }, [media, playback]);

  // Initial load & media change handling (NEVER runs on fullscreen toggle!)
  useEffect(() => {
    const currentMedia = latestMediaRef.current;
    const currentPlayback = latestPlaybackRef.current;
    if (mediaKey !== lastMediaKeyRef.current) {
      lastMediaKeyRef.current = mediaKey;
      stopDirectConvergence();
      const initialObserved = initialObservedPlaybackState();
      observedPlaybackRef.current = initialObserved;
      setObservedPlayback(initialObserved);
      correctionAttemptsRef.current = 0;
      setCorrectionExhausted(false);
      directEventObservedRef.current = false;
      expectedEchoesRef.current = [];
      fastConvergenceUntilRef.current = Date.now() + FAST_CONVERGENCE_DURATION_MS;

      if (currentMedia) {
        loadProvider(currentMedia, currentPlayback, true);
      } else {
        setEmbedUrl(undefined);
        setLoadState("idle");
      }
    }
  }, [loadProvider, mediaKey, stopDirectConvergence]);

  // Staged Soft / Hard Resync Trigger
  useEffect(() => {
    if (lastResyncKeyRef.current === resyncKey) return;
    lastResyncKeyRef.current = resyncKey;

    fastConvergenceUntilRef.current = Date.now() + FAST_CONVERGENCE_DURATION_MS;
    correctionAttemptsRef.current = 0;
    setCorrectionExhausted(false);

    if (__DEV__) {
      console.log("[CowatchSync] Manual Resync tapped -> Initiating staged recovery");
    }

    const currentMedia = latestMediaRef.current;
    const currentPlayback = latestPlaybackRef.current;
    if (!currentMedia) return;

    if (providerAdapters[currentMedia.providerId]?.canReceiveDirectCommands) {
      // Soft direct convergence first - DO NOT reload WebView
      startDirectConvergence();
    } else {
      // Best-effort provider timestamp reload
      loadProvider(
        currentMedia,
        currentPlayback,
        true,
        `resync:${Date.now()}`,
      );
    }
  }, [loadProvider, resyncKey, startDirectConvergence]);

  // Handle Playback State changes from Socket with Fast Discrete Command Dispatch
  useEffect(() => {
    const currentMedia = latestMediaRef.current;
    const currentPlayback = latestPlaybackRef.current;
    const actionId = currentPlayback.actionId;
    if (
      !currentMedia ||
      !actionId ||
      processedActionIdRef.current === actionId
    ) {
      return;
    }
    processedActionIdRef.current = actionId;

    const mode = getPlaybackActionMode(
      currentMedia.providerId,
      currentPlayback,
      participantId,
      locallyAppliedActionIdsRef.current,
    );

    if (mode === "none") {
      if (currentPlayback.sourceActionId) {
        locallyAppliedActionIdsRef.current.delete(
          currentPlayback.sourceActionId,
        );
      }
      return;
    }

    if (mode === "direct") {
      // 1. Dispatch immediate discrete command for zero lag reaction
      if (currentPlayback.action) {
        const targetTime =
          currentPlayback.action === "seek"
            ? currentPlayback.currentTime
            : undefined;
        rememberExpectedEcho({
          actionId,
          type: currentPlayback.action,
          currentTime: targetTime,
        });
        dispatchDiscreteCommand(currentPlayback.action, targetTime);
      }
      // 2. Follow with direct convergence verification
      startDirectConvergence();
      return;
    }

    loadProvider(currentMedia, currentPlayback, true, actionId);
  }, [
    dispatchDiscreteCommand,
    loadProvider,
    mediaKey,
    participantId,
    playback.actionId,
    rememberExpectedEcho,
    startDirectConvergence,
  ]);

  // Fallback load timeout
  useEffect(() => {
    if (!embedUrl || loadState !== "loading") return;
    const timer = setTimeout(() => {
      setLoadState((prev) => (prev === "loading" ? "ready" : prev));
    }, 12000);
    return () => clearTimeout(timer);
  }, [embedUrl, loadState, webKey]);

  // Host Timeline Reporting
  useEffect(() => {
    if (!isHost || !latestMediaRef.current) return;
    const timer = setInterval(() => {
      const currentMedia = latestMediaRef.current;
      if (!currentMedia) return;
      const report = buildHostTimelineReport(
        latestPlaybackRef.current,
        observedPlaybackRef.current,
        providerAdapters[currentMedia.providerId],
      );
      onTimeline(report.currentTime, report.playing);
    }, syncIntervalMs);
    return () => clearInterval(timer);
  }, [
    isHost,
    mediaKey,
    onTimeline,
    syncIntervalMs,
    playback.playing,
    playback.currentTime,
    playback.updatedAt,
  ]);

  // Staged Drift Correction & Fast Convergence Loop (600ms check)
  useEffect(() => {
    if (!media || isHost) return;

    const timer = setInterval(() => {
      const isFastWindow = Date.now() < fastConvergenceUntilRef.current;
      const localTime = observedPlaybackRef.current.currentTime;
      if (!capabilities?.canObserveTime || localTime === undefined) return;

      const target = estimateClientTime(latestPlaybackRef.current, Date.now(), true);
      const drift = localTime - target;
      const classification = classifyDrift(drift);

      if (classification === "in-sync") {
        correctionAttemptsRef.current = 0;
        setCorrectionExhausted(false);
        return;
      }

      // If not in fast convergence window, throttle by syncIntervalMs
      if (!isFastWindow && Date.now() - correctionAtRef.current < syncIntervalMs) {
        return;
      }

      correctionAtRef.current = Date.now();

      if (__DEV__) {
        console.log(
          `[CowatchSync] provider=${media.providerId} target=${target.toFixed(1)}s local=${localTime.toFixed(1)}s drift=${drift.toFixed(2)}s action=${classification}`,
        );
      }

      if (capabilities.canReceiveDirectCommands) {
        startDirectConvergence();
        return;
      }

      if (!capabilities.canStartAtTimestamp) return;

      if (correctionAttemptsRef.current >= 3) {
        setCorrectionExhausted(true);
        return;
      }
      correctionAttemptsRef.current += 1;
      loadProvider(
        media,
        latestPlaybackRef.current,
        true,
        `drift:${latestPlaybackRef.current.updatedAt}`,
      );
    }, 600);

    return () => clearInterval(timer);
  }, [
    capabilities,
    isHost,
    loadProvider,
    media,
    startDirectConvergence,
    syncIntervalMs,
  ]);

  // Receive player events from WebView bridge
  const handleWebViewMessage = (raw: string, originUrl?: string) => {
    if (!media) return;

    if (originUrl && embedUrl) {
      try {
        const urlObj = new URL(originUrl);
        const embedObj = new URL(embedUrl);
        const isLocalHost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1' || urlObj.hostname === '10.0.2.2';
        if (urlObj.origin !== embedObj.origin && !isLocalHost) {
          if (__DEV__) {
            console.warn(`[CowatchPlayer] Blocked message from untrusted origin: ${urlObj.origin}`);
          }
          return;
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    }

    try {
      const parsed = JSON.parse(raw);
      let playerEvent: CowatchPlayerEvent | undefined;

      if (parsed.source === "window_message") {
        playerEvent = parseProviderMessage(
          media.providerId,
          parsed.origin,
          parsed.data,
        );
      } else if (parsed.source === "video_event") {
        playerEvent = {
          type: parsed.event === "seeked" ? "seek" : parsed.event,
          ...(typeof parsed.currentTime === "number"
            ? { currentTime: parsed.currentTime }
            : {}),
        };
      }

      if (!playerEvent) return;
      const now = Date.now();
      setLoadState("ready");

      const observed = applyObservedPlayerEvent(
        observedPlaybackRef.current,
        playerEvent,
        latestPlaybackRef.current.playing,
        now,
      );
      observedPlaybackRef.current = observed;
      setObservedPlayback(observed);

      if (providerAdapters[media.providerId]?.canReceiveDirectCommands) {
        const expectedPlaying = latestPlaybackRef.current.playing;
        if (
          (playerEvent.type === "play" && expectedPlaying) ||
          ((playerEvent.type === "pause" || playerEvent.type === "ended") &&
            !expectedPlaying)
        ) {
          stopDirectConvergence();
        }
        if (!directEventObservedRef.current) {
          directEventObservedRef.current = true;
          startDirectConvergence();
        }
      }

      const awaitingPlaybackEcho = hasPendingExpectedPlaybackEcho(
        expectedEchoesRef.current,
        now,
      );
      const consumed = consumeExpectedProviderEcho(
        expectedEchoesRef.current,
        playerEvent,
        now,
      );
      expectedEchoesRef.current = consumed.remaining;

      if (
        !shouldForwardProviderEvent(
          playerEvent,
          latestPlaybackRef.current,
          isHost,
          consumed.suppressed || awaitingPlaybackEcho,
        )
      ) {
        return;
      }

      const req: CowatchPlaybackRequest = {
        actionId: `action-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        locallyApplied: true,
      };
      locallyAppliedActionIdsRef.current.add(req.actionId);

      if (playerEvent.type === "play") {
        onPlay(req);
      } else if (playerEvent.type === "pause" || playerEvent.type === "ended") {
        onPause(req);
      } else if (
        playerEvent.type === "seek" &&
        playerEvent.currentTime !== undefined
      ) {
        onSeek(playerEvent.currentTime, req);
      }
    } catch {}
  };

  const syncState = capabilities
    ? derivePlayerSyncState(
        playback,
        observedPlayback,
        loadState,
        capabilities,
        correctionExhausted,
      )
    : "converging";

  const getSyncBadgeInfo = () => {
    if (loadState === "failed") {
      return { label: "STREAM FAILED", dotStyle: styles.syncDotFailed };
    }
    if (syncState === "limited-provider") {
      return { label: "LIMITED SYNC", dotStyle: styles.syncDotLimited };
    }
    if (syncState === "converging" || loadState === "loading") {
      return { label: "APPLYING SYNC", dotStyle: styles.syncDotConverging };
    }
    if (syncState === "needs-user-gesture") {
      return { label: "TAP TO PLAY", dotStyle: styles.syncDotGesture };
    }
    if (syncState === "failed") {
      return { label: "SYNC ERROR", dotStyle: styles.syncDotFailed };
    }
    return playback.playing
      ? { label: "SYNCED PLAYING", dotStyle: styles.syncDotLive }
      : { label: "SYNCED PAUSED", dotStyle: styles.syncDotPaused };
  };

  const badgeInfo = getSyncBadgeInfo();

  if (!media || !embedUrl) {
    return (
      <View
        style={[
          styles.container,
          isLandscape ? styles.fullscreenContainer : styles.portraitContainer,
        ]}
      >
        <View style={styles.noMediaContainer}>
          <Ionicons
            name="film-outline"
            size={44}
            color={colors.accent.primary}
          />
          <Text style={styles.noMediaTitle}>No Media Selected</Text>
          <Text style={styles.noMediaSubtitle}>
            {isHost
              ? "Select a movie or TV episode to begin synchronized screening."
              : "Waiting for the host to select media..."}
          </Text>
          {isHost && onChangeMediaPress && (
            <TouchableOpacity
              style={styles.chooseMediaButton}
              onPress={onChangeMediaPress}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={16} color={colors.bg.base} />
              <Text style={styles.chooseMediaText}>Select Media</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={showOverlayTemporarily}>
      <View
        style={[
          styles.container,
          isLandscape ? styles.fullscreenContainer : styles.portraitContainer,
        ]}
      >
        {loadState !== "failed" ? (
          <WebView
            ref={webViewRef}
            key={webKey}
            source={{ uri: embedUrl }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsFullscreenVideo={true}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE_JS}
            injectedJavaScript={INJECTED_BRIDGE_JS}
            onMessage={(e) => handleWebViewMessage(e.nativeEvent.data, e.nativeEvent.url)}
            onLoadEnd={() => {
              if (loadState === "loading") setLoadState("ready");
              if (capabilities?.canReceiveDirectCommands) {
                startDirectConvergence();
              }
            }}
            onError={() => setLoadState("failed")}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text style={styles.loadingText}>
                  Connecting to room stream...
                </Text>
              </View>
            )}
          />
        ) : (
          <View style={styles.errorOverlay}>
            <Ionicons
              name="alert-circle-outline"
              size={40}
              color={colors.accent.primary}
            />
            <Text style={styles.errorTitle}>Stream Connection Failed</Text>
            <Text style={styles.errorSubtitle}>
              Try selecting Resync or changing the streaming mirror.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoadState("loading");
                setWebKey((prev) => prev + 1);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Retry Stream</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Minimal Non-blocking Overlay */}
        {overlayVisible && (
          <View
            style={[
              styles.topOverlay,
              isLandscape && styles.fullscreenTopOverlay,
            ]}
            pointerEvents="box-none"
          >
            {isLandscape ? (
              // Fullscreen Mode Top Bar
              <View style={styles.fullscreenTopRow} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.fullscreenIconBtn}
                  onPress={onToggleFullscreen}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>

                <View style={styles.syncBadge}>
                  <View style={[styles.syncDot, badgeInfo.dotStyle]} />
                  <Text style={styles.syncText}>{badgeInfo.label}</Text>
                </View>

                <View style={styles.fullscreenRightActions} pointerEvents="box-none">
                  {onResync && (
                    <TouchableOpacity
                      style={styles.fullscreenPillBtn}
                      onPress={onResync}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="sync-outline"
                        size={14}
                        color={colors.accent.primary}
                      />
                      <Text style={styles.fullscreenPillText}>Resync</Text>
                    </TouchableOpacity>
                  )}

                  {onToggleMic && (
                    <TouchableOpacity
                      style={[
                        styles.fullscreenIconBtn,
                        microphoneEnabled && styles.fullscreenIconBtnActive,
                      ]}
                      onPress={onToggleMic}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={microphoneEnabled ? "mic" : "mic-off"}
                        size={16}
                        color={microphoneEnabled ? colors.bg.base : colors.text.primary}
                      />
                    </TouchableOpacity>
                  )}

                  {onToggleCam && (
                    <TouchableOpacity
                      style={[
                        styles.fullscreenIconBtn,
                        cameraEnabled && styles.fullscreenIconBtnActive,
                      ]}
                      onPress={onToggleCam}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={cameraEnabled ? "videocam" : "videocam-off"}
                        size={16}
                        color={cameraEnabled ? colors.bg.base : colors.text.primary}
                      />
                    </TouchableOpacity>
                  )}

                  {onOpenChat && (
                    <TouchableOpacity
                      style={styles.fullscreenIconBtn}
                      onPress={onOpenChat}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={16}
                        color={colors.text.primary}
                      />
                      {unreadChatCount > 0 && (
                        <View style={styles.chatBadge}>
                          <Text style={styles.chatBadgeText}>
                            {unreadChatCount}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.fullscreenIconBtn}
                    onPress={onToggleFullscreen}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="contract"
                      size={18}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Portrait Mode Top Bar
              <View style={styles.portraitTopRow} pointerEvents="box-none">
                <View style={styles.syncBadge}>
                  <View style={[styles.syncDot, badgeInfo.dotStyle]} />
                  <Text style={styles.syncText}>{badgeInfo.label}</Text>
                </View>

                <TouchableOpacity
                  style={styles.fullscreenIconBtn}
                  onPress={onToggleFullscreen}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="expand"
                    size={18}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Fullscreen Floating Chat Toast */}
        {isLandscape && chatToast && (
          <TouchableOpacity
            style={styles.fullscreenChatToast}
            onPress={() => {
              if (onOpenChat) onOpenChat();
              if (onDismissChatToast) onDismissChatToast();
            }}
            activeOpacity={0.85}
          >
            <View style={styles.toastIconCircle}>
              <Ionicons
                name="chatbubble"
                size={12}
                color={colors.accent.primary}
              />
            </View>
            <View style={styles.toastContent}>
              <Text style={styles.toastSender}>{chatToast.senderName}</Text>
              <Text style={styles.toastText} numberOfLines={1}>
                {chatToast.text}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden",
  },
  portraitContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  fullscreenContainer: {
    width: "100%",
    height: "100%",
    aspectRatio: undefined,
  },
  webView: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: colors.bg.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  errorOverlay: {
    flex: 1,
    backgroundColor: colors.bg.card,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
  },
  errorSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: "center",
    maxWidth: 260,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.bg.base,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    zIndex: 10,
  },
  fullscreenTopOverlay: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  portraitTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fullscreenTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  fullscreenRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullscreenPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(229, 184, 105, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fullscreenPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent.primary,
  },
  fullscreenIconBtnActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncDotLive: {
    backgroundColor: colors.status.success,
  },
  syncDotPaused: {
    backgroundColor: colors.accent.primary,
  },
  syncDotConverging: {
    backgroundColor: colors.accent.light,
  },
  syncDotGesture: {
    backgroundColor: colors.status.warning,
  },
  syncDotLimited: {
    backgroundColor: colors.text.faint,
  },
  syncDotFailed: {
    backgroundColor: colors.status.error,
  },
  syncText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: 0.8,
  },
  fullscreenIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    position: "relative",
  },
  chatBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: colors.brand.red,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  chatBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#fff",
  },
  fullscreenChatToast: {
    position: "absolute",
    bottom: 24,
    left: 20,
    maxWidth: 320,
    backgroundColor: "rgba(17, 20, 25, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(229, 184, 105, 0.35)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 25,
  },
  toastIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(229, 184, 105, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  toastContent: {
    flex: 1,
  },
  toastSender: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent.primary,
  },
  toastText: {
    fontSize: 11,
    color: colors.text.primary,
  },
  noMediaContainer: {
    flex: 1,
    backgroundColor: colors.bg.card,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  noMediaTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
  },
  noMediaSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: "center",
    maxWidth: 280,
  },
  chooseMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chooseMediaText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.bg.base,
  },
});
