import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
  BackHandler,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  safeLockOrientation,
  safeUnlockOrientation,
  safeSetImmersiveFullscreen,
  OrientationLock,
} from "../../src/utils/orientation";
import { useQuery } from "@tanstack/react-query";
import { fetchMovieDetails, fetchTVDetails } from "../../src/services/media-api";
import { Ionicons } from "@expo/vector-icons";
import {
  cowatchSocket,
  emitCowatchWithAck,
} from "../../src/services/cowatch/socket";
import {
  getRoomIdentityAsync,
  saveRoomIdentity,
  removeRoomIdentity,
  savePreviousRoomLocator,
  clearPreviousRoomLocator,
} from "../../src/services/cowatch/storage";
import { config } from "../../src/config/env";
import { useCowatchCall } from "../../src/services/cowatch/useCowatchCall";
import { CowatchPlayer } from "../../src/components/cowatch/CowatchPlayer";
import { CowatchCallView } from "../../src/components/cowatch/CowatchCallView";
import { CowatchControlBar } from "../../src/components/cowatch/CowatchControlBar";
import { CowatchChatSheet } from "../../src/components/cowatch/CowatchChatSheet";
import { CowatchPeopleSheet } from "../../src/components/cowatch/CowatchPeopleSheet";
import { CowatchMediaPickerSheet } from "../../src/components/cowatch/CowatchMediaPickerSheet";
import type {
  CowatchMedia,
  CowatchMessage,
  CowatchPlayback,
  CowatchPlaybackRequest,
  CowatchResult,
  CowatchRoom,
  ProviderId,
} from "../../src/services/cowatch/types";
import { colors } from "../../src/theme/colors";

type JoinResult = CowatchResult<{
  room: CowatchRoom;
  participantId: string;
  reconnectToken: string;
  reconnected: boolean;
}>;

const DISCONNECTED_ROOM: CowatchRoom = {
  code: "",
  createdAt: 0,
  hostId: "",
  participants: [],
  maxParticipants: 5,
  media: null,
  playback: {
    playing: false,
    currentTime: 0,
    updatedAt: 0,
  },
  messages: [],
  chatMaxMessageLength: 280,
  syncIntervalMs: 2500,
  driftToleranceSeconds: 2.0,
  callConfig: {
    maxParticipants: 5,
    iceServers: [],
  },
};

export default function CowatchRoomScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const router = useRouter();

  const code = (roomCode || "").toUpperCase().trim();

  // Room & Identity State
  const [room, setRoom] = useState<CowatchRoom | null>(null);
  const [participantId, setParticipantId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [resyncKey, setResyncKey] = useState(0);

  // Sheets & Navigation State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideVideo, setHideVideo] = useState(false);
  const [chatToast, setChatToast] = useState<{
    id: string;
    senderName: string;
    text: string;
  } | null>(null);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const participantIdRef = useRef(participantId);
  const isChatOpenRef = useRef(isChatOpen);
  const joinInFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    participantIdRef.current = participantId;
  }, [participantId]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) {
      setUnreadChatCount(0);
      setChatToast(null);
    }
  }, [isChatOpen]);

  // Load stored identity on mount
  useEffect(() => {
    getRoomIdentityAsync(code).then((identity) => {
      if (identity) {
        setDisplayName(identity.displayName);
        setParticipantId(identity.participantId);
      }
    });
  }, [code]);

  const join = useCallback(
    async (name: string, reconnectToken?: string) => {
      if (joinInFlightRef.current) return;
      joinInFlightRef.current = true;
      setJoining(true);
      setError("");

      try {
        const result = await emitCowatchWithAck<JoinResult>("room:join", {
          roomCode: code,
          displayName: name,
          reconnectToken,
        });

        if (!result.ok) {
          setError(result.error.message || "Failed to enter room.");
          setJoining(false);
          joinInFlightRef.current = false;
          return;
        }

        setRoom(result.room);
        setParticipantId(result.participantId);
        setDisplayName(name);

        await saveRoomIdentity(code, {
          participantId: result.participantId,
          reconnectToken: result.reconnectToken,
          displayName: name,
        });

        await savePreviousRoomLocator(code);
      } catch (err: any) {
        setError(err?.message || "Connection failure.");
      } finally {
        setJoining(false);
        joinInFlightRef.current = false;
      }
    },
    [code],
  );

  // Auto-reconnect if stored identity exists
  useEffect(() => {
    if (!code) return;
    getRoomIdentityAsync(code).then((stored) => {
      if (stored && stored.displayName && stored.reconnectToken) {
        join(stored.displayName, stored.reconnectToken);
      }
    });
  }, [code, join]);

  // Socket Event Subscriptions
  useEffect(() => {
    if (!cowatchSocket.connected) {
      cowatchSocket.connect();
    }

    const onRoomState = (updatedRoom: CowatchRoom) => {
      setRoom(updatedRoom);
    };

    const onPlaybackState = (playback: CowatchPlayback) => {
      setRoom((prev) => (prev ? { ...prev, playback } : prev));
    };

    const onPlaybackSync = (sync: {
      playing: boolean;
      currentTime: number;
      updatedAt: number;
    }) => {
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              playback: {
                ...prev.playback,
                ...sync,
              },
            }
          : prev,
      );
    };

    const onMediaChange = (media: CowatchMedia | null) => {
      setRoom((prev) => (prev ? { ...prev, media } : prev));
    };

    const onChatMessage = (msg: CowatchMessage) => {
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, msg],
            }
          : prev,
      );

      // Trigger chat unread badge and toast if chat is closed and sender is not me
      if (
        !isChatOpenRef.current &&
        msg.senderId !== participantIdRef.current
      ) {
        setUnreadChatCount((prev) => prev + 1);
        setChatToast({
          id: msg.id,
          senderName: msg.senderName,
          text: msg.text,
        });

        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          setChatToast(null);
        }, 4000);
      }
    };

    const onParticipantJoined = (participant: any) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const exists = prev.participants.some((p) => p.id === participant.id);
        if (exists) {
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.id === participant.id ? participant : p,
            ),
          };
        }
        return {
          ...prev,
          participants: [...prev.participants, participant],
        };
      });
    };

    const onParticipantLeft = ({
      participantId: leftId,
    }: {
      participantId: string;
    }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.filter((p) => p.id !== leftId),
        };
      });
    };

    const onKicked = ({ reason }: { reason: string }) => {
      Alert.alert("Removed from Room", reason || "You were removed by host.");
      handleLeaveRoom(false);
    };

    const onRoomClosed = ({ reason }: { reason: string }) => {
      Alert.alert("Room Closed", reason || "Screening lounge has ended.");
      handleLeaveRoom(false);
    };

    cowatchSocket.on("room:state", onRoomState);
    cowatchSocket.on("playback:state", onPlaybackState);
    cowatchSocket.on("playback:sync", onPlaybackSync);
    cowatchSocket.on("media:change", onMediaChange);
    cowatchSocket.on("chat:message", onChatMessage);
    cowatchSocket.on("participant:joined", onParticipantJoined);
    cowatchSocket.on("participant:left", onParticipantLeft);
    cowatchSocket.on("participant:kicked", onKicked);
    cowatchSocket.on("room:closed", onRoomClosed);

    return () => {
      cowatchSocket.off("room:state", onRoomState);
      cowatchSocket.off("playback:state", onPlaybackState);
      cowatchSocket.off("playback:sync", onPlaybackSync);
      cowatchSocket.off("media:change", onMediaChange);
      cowatchSocket.off("chat:message", onChatMessage);
      cowatchSocket.off("participant:joined", onParticipantJoined);
      cowatchSocket.off("participant:left", onParticipantLeft);
      cowatchSocket.off("participant:kicked", onKicked);
      cowatchSocket.off("room:closed", onRoomClosed);
    };
  }, []);

  // WebRTC Call Hook
  const call = useCowatchCall({
    room: room || { ...DISCONNECTED_ROOM, code },
    participantId: participantId || "",
    onError: setError,
  });

  // Fullscreen orientation & immersive navigation handling
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      await safeSetImmersiveFullscreen(true, () => isMountedRef.current);
      await safeLockOrientation(
        OrientationLock.LANDSCAPE,
        () => isMountedRef.current,
      );
    } else {
      setIsFullscreen(false);
      await safeSetImmersiveFullscreen(false, () => isMountedRef.current);
      await safeLockOrientation(
        OrientationLock.PORTRAIT_UP,
        () => isMountedRef.current,
      );
    }
  };

  // Exit fullscreen and restore portrait / system UI safely on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      safeSetImmersiveFullscreen(false);
      safeLockOrientation(OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // Android Back Handler
  useEffect(() => {
    const onBackPress = () => {
      if (isFullscreen) {
        toggleFullscreen();
        return true;
      }
      if (isChatOpen) {
        setIsChatOpen(false);
        return true;
      }
      if (isPeopleOpen) {
        setIsPeopleOpen(false);
        return true;
      }
      if (isMediaPickerOpen) {
        setIsMediaPickerOpen(false);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [isFullscreen, isChatOpen, isPeopleOpen, isMediaPickerOpen]);

  // Leave room logic
  const handleLeaveRoom = async (emitSocket = true) => {
    if (emitSocket) {
      cowatchSocket.emit("room:leave", {});
    }
    await removeRoomIdentity(code);
    await clearPreviousRoomLocator();
    if (isFullscreen) {
      await safeSetImmersiveFullscreen(false);
      await safeLockOrientation(OrientationLock.PORTRAIT_UP);
    }
    router.replace("/");
  };

  const isHost = Boolean(room && participantId && room.hostId === participantId);

  const currentMediaId = room?.media?.id;
  const currentMediaType = room?.media?.type;
  const { data: mediaMovie } = useQuery({
    queryKey: ['roomMovieDetails', currentMediaId],
    queryFn: () => fetchMovieDetails(currentMediaId!),
    enabled: currentMediaType === 'movie' && !!currentMediaId,
  });
  const { data: mediaShow } = useQuery({
    queryKey: ['roomTVDetails', currentMediaId],
    queryFn: () => fetchTVDetails(currentMediaId!),
    enabled: currentMediaType === 'tv' && !!currentMediaId,
  });

  const roomMediaTitle = currentMediaType === 'tv' ? mediaShow?.name : mediaMovie?.title;

  // Playback Control Handlers
  const handlePlay = (request?: CowatchPlaybackRequest) => {
    if (!room) return;
    const req = request || {
      actionId: `action-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      locallyApplied: false,
    };
    cowatchSocket.emit("playback:play", req, (result: CowatchResult) => {
      if (!result.ok) setError(result.error.message);
    });
  };

  const handlePause = (request?: CowatchPlaybackRequest) => {
    if (!room) return;
    const req = request || {
      actionId: `action-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      locallyApplied: false,
    };
    cowatchSocket.emit("playback:pause", req, (result: CowatchResult) => {
      if (!result.ok) setError(result.error.message);
    });
  };

  const handleResync = () => {
    setResyncKey((prev) => prev + 1);
    setSyncToast("Resyncing playback with room...");
    if (syncToastTimeoutRef.current) clearTimeout(syncToastTimeoutRef.current);
    syncToastTimeoutRef.current = setTimeout(() => {
      setSyncToast(null);
    }, 2500);
  };

  const handleSeek = (
    currentTime: number,
    request?: CowatchPlaybackRequest,
  ) => {
    if (!room) return;
    cowatchSocket.emit(
      "playback:seek",
      { currentTime, ...request },
      (result: CowatchResult) => {
        if (!result.ok) setError(result.error.message);
      },
    );
  };

  const handleTimeline = (currentTime: number, playing: boolean) => {
    if (!room || !isHost) return;
    cowatchSocket.emit("playback:timeline", { currentTime, playing });
  };

  const handleChangeMedia = (media: CowatchMedia) => {
    if (!room) return;
    cowatchSocket.emit("media:change", { media }, (result: CowatchResult) => {
      if (!result.ok) setError(result.error.message);
    });
  };

  const handleChangeProvider = (providerId: ProviderId) => {
    if (!room) return;
    cowatchSocket.emit(
      "provider:change",
      { providerId },
      (result: CowatchResult) => {
        if (!result.ok) setError(result.error.message);
      },
    );
  };

  const handleSendChat = (text: string) => {
    if (!room || !participantId) return;
    cowatchSocket.emit("chat:send", { text }, (result: CowatchResult) => {
      if (!result.ok) setError(result.error.message);
    });
  };

  const handleKickParticipant = (targetParticipantId: string) => {
    if (!room || !isHost) return;
    cowatchSocket.emit(
      "participant:kick",
      { participantId: targetParticipantId },
      (result: CowatchResult) => {
        if (!result.ok) setError(result.error.message);
      },
    );
  };

  const handleTransferHost = (targetParticipantId: string) => {
    if (!room || !isHost) return;
    cowatchSocket.emit(
      "room:transfer-host",
      { participantId: targetParticipantId },
      (result: CowatchResult<{ hostId: string }>) => {
        if (!result.ok) setError(result.error.message);
      },
    );
  };

  const handleShareInvite = async () => {
    const shareUrl = `${config.cowatchPublicUrl}/join/${code}`;
    try {
      await Share.share({
        title: "Join LauraTV Cowatch Lounge",
        message: `Watch together with me on LauraTV!\nRoom code: ${code}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  };

  // 1. Initial Enter Room / Nickname Screen
  if (!room) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg.base} />
        <View style={styles.joinContainer}>
          <View style={styles.joinCard}>
            <View style={styles.joinHeader}>
              <Ionicons
                name="film-outline"
                size={36}
                color={colors.accent.primary}
              />
              <Text style={styles.joinTitle}>Private Screening Lounge</Text>
              <Text style={styles.joinSubtitle}>
                Synchronized cinematic watch room
              </Text>
            </View>

            <View style={styles.codePill}>
              <Text style={styles.codePillLabel}>ROOM</Text>
              <Text style={styles.codePillVal}>{code}</Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={colors.status.error}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>YOUR SCREEN NAME</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Enter nickname..."
                placeholderTextColor={colors.text.faint}
                value={displayName}
                onChangeText={setDisplayName}
                autoFocus={true}
                maxLength={24}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.enterBtn,
                (!displayName.trim() || joining) && styles.enterBtnDisabled,
              ]}
              onPress={() => {
                const name = displayName.trim();
                if (!name) {
                  setError("Please enter a display nickname.");
                  return;
                }
                join(name);
              }}
              disabled={joining}
              activeOpacity={0.8}
            >
              <Text style={styles.enterBtnText}>
                {joining ? "Connecting to Room..." : "Enter Room"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.privacyNote}>
              Private room session. No account or registration required.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Main Lounge Room with Single Persistent CowatchPlayer
  return (
    <View style={[styles.rootContainer, isFullscreen && styles.fullscreenRoot]}>
      <StatusBar
        hidden={isFullscreen}
        barStyle="light-content"
        backgroundColor={colors.bg.base}
      />

      {/* Top Lounge Bar (Portrait Only) */}
      {!isFullscreen && (
        <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                Alert.alert(
                  "Leave Screening Lounge?",
                  "Are you sure you want to leave this Cowatch room?",
                  [
                    { text: "Stay", style: "cancel" },
                    {
                      text: "Leave",
                      style: "destructive",
                      onPress: () => handleLeaveRoom(),
                    },
                  ],
                );
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.text.primary}
              />
              <Text style={styles.backText}>Lounge</Text>
            </TouchableOpacity>

            <View style={styles.roomBadgeContainer}>
              <View style={styles.roomCodeBadge}>
                <Text style={styles.roomCodeText}>{room.code}</Text>
              </View>
              {room.shareSlug && (
                <Text style={styles.slugText}>/{room.shareSlug}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareInvite}
              activeOpacity={0.7}
            >
              <Ionicons
                name="share-social"
                size={14}
                color={colors.accent.primary}
              />
              <Text style={styles.shareText}>Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Error Alert Bar */}
          {error ? (
            <View style={styles.errorAlertBar}>
              <Ionicons
                name="alert-circle"
                size={14}
                color={colors.status.error}
              />
              <Text style={styles.errorAlertText}>{error}</Text>
            </View>
          ) : null}
        </SafeAreaView>
      )}

      {/* Persistent Synchronized Player Surface - NEVER unmounted across fullscreen transitions */}
      <View
        style={
          isFullscreen
            ? styles.fullscreenPlayerContainer
            : styles.playerContainer
        }
      >
        <CowatchPlayer
          media={room.media}
          playback={room.playback}
          participantId={participantId}
          isHost={isHost}
          syncIntervalMs={room.syncIntervalMs}
          driftToleranceSeconds={room.driftToleranceSeconds}
          resyncKey={resyncKey}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          onTimeline={handleTimeline}
          onChangeMediaPress={() => setIsMediaPickerOpen(true)}
          unreadChatCount={unreadChatCount}
          onOpenChat={() => setIsChatOpen(true)}
          chatToast={chatToast}
          onDismissChatToast={() => setChatToast(null)}
          onResync={handleResync}
          microphoneEnabled={call.microphoneEnabled}
          cameraEnabled={call.cameraEnabled}
          onToggleMic={call.toggleMicrophone}
          onToggleCam={call.toggleCamera}
        />
      </View>

      {/* Portrait Scrollable Details & Bottom Control Bar */}
      {!isFullscreen && (
        <View style={styles.portraitLoungeBody}>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* WebRTC Video Call Tiles (if call is active) */}
            <CowatchCallView
              participants={room.participants}
              myParticipantId={participantId}
              localStream={call.localStream}
              remoteStreams={call.remoteStreams}
              microphoneEnabled={call.microphoneEnabled}
              cameraEnabled={call.cameraEnabled}
              hideVideo={hideVideo}
            />

            {/* Media Context & Host Actions */}
            <View style={styles.mediaContextCard}>
              <View style={styles.mediaContextInfo}>
                <Text style={styles.mediaContextType}>
                  {room.media?.type === "tv"
                    ? `TV SERIES · S${room.media.season ?? 1} E${room.media.episode ?? 1}`
                    : room.media
                      ? "FEATURE FILM"
                      : "SYNCHRONIZED SCREENING"}
                </Text>
                <Text style={styles.mediaContextTitle}>
                  {room.media
                    ? roomMediaTitle || (room.media.type === "tv" ? "TV Series Episode" : "Feature Film")
                    : "No media playing"}
                </Text>
              </View>

              {isHost && (
                <TouchableOpacity
                  style={styles.changeMediaPill}
                  onPress={() => setIsMediaPickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="film-outline"
                    size={13}
                    color={colors.accent.primary}
                  />
                  <Text style={styles.changeMediaPillText}>Change Title</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Floating Chat Toast (Portrait) */}
          {chatToast && (
            <TouchableOpacity
              style={styles.chatToast}
              onPress={() => {
                setIsChatOpen(true);
                setChatToast(null);
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

          {/* Floating Sync Status Toast (Portrait) */}
          {syncToast && (
            <View style={styles.syncToastBox}>
              <Ionicons name="sync" size={13} color={colors.accent.primary} />
              <Text style={styles.syncToastText}>{syncToast}</Text>
            </View>
          )}

          {/* Portrait Bottom Control Bar */}
          <CowatchControlBar
            isPlaying={room.playback.playing}
            microphoneEnabled={call.microphoneEnabled}
            cameraEnabled={call.cameraEnabled}
            activeProviderId={room.media?.providerId}
            unreadChatCount={unreadChatCount}
            participantCount={room.participants.length}
            isFullscreen={false}
            hideVideo={hideVideo}
            onToggleHideVideo={() => setHideVideo((prev) => !prev)}
            onPlay={() => handlePlay()}
            onPause={() => handlePause()}
            onResync={handleResync}
            onToggleMic={call.toggleMicrophone}
            onToggleCam={call.toggleCamera}
            onChangeProvider={handleChangeProvider}
            onOpenChat={() => setIsChatOpen(true)}
            onOpenPeople={() => setIsPeopleOpen(true)}
            onToggleFullscreen={toggleFullscreen}
            onShare={handleShareInvite}
            onLeave={() => {
              Alert.alert(
                "Leave Screening Lounge?",
                "Are you sure you want to leave?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Leave",
                    style: "destructive",
                    onPress: () => handleLeaveRoom(),
                  },
                ],
              );
            }}
          />
        </View>
      )}

      {/* Live Ephemeral Chat Modal */}
      <CowatchChatSheet
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={room.messages}
        maxMessageLength={room.chatMaxMessageLength}
        onSendMessage={handleSendChat}
        myParticipantId={participantId}
        isFullscreen={isFullscreen}
      />

      {/* Participants Management Modal */}
      <CowatchPeopleSheet
        isOpen={isPeopleOpen}
        onClose={() => setIsPeopleOpen(false)}
        participants={room.participants}
        hostId={room.hostId}
        myParticipantId={participantId}
        onKickParticipant={handleKickParticipant}
        onTransferHost={handleTransferHost}
      />

      {/* Media Selector Modal (Host only) */}
      <CowatchMediaPickerSheet
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelectMedia={handleChangeMedia}
        currentProviderId={room.media?.providerId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  rootContainer: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  fullscreenRoot: {
    backgroundColor: "#000",
  },
  topSafeArea: {
    backgroundColor: colors.bg.surface,
  },
  playerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    zIndex: 5,
  },
  fullscreenPlayerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    aspectRatio: undefined,
    zIndex: 10,
  },
  portraitLoungeBody: {
    flex: 1,
    position: "relative",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  topBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    gap: 2,
  },
  backText: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: "600",
  },
  roomBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roomCodeBadge: {
    backgroundColor: colors.accent.muted,
    borderWidth: 1,
    borderColor: colors.accent.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomCodeText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.accent.primary,
    letterSpacing: 1.5,
    fontFamily: "monospace",
  },
  slugText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: "monospace",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.medium,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent.primary,
  },
  errorAlertBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(239, 68, 68, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  errorAlertText: {
    fontSize: 11,
    color: colors.status.error,
    fontWeight: "600",
    flex: 1,
  },
  mediaContextCard: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mediaContextInfo: {
    flex: 1,
    gap: 2,
  },
  mediaContextType: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.accent.primary,
    letterSpacing: 1,
  },
  mediaContextTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.primary,
  },
  changeMediaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.medium,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeMediaPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent.primary,
  },
  chatToast: {
    position: "absolute",
    bottom: 64,
    left: 12,
    right: 12,
    backgroundColor: "rgba(17, 20, 25, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(229, 184, 105, 0.35)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 15,
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
  joinContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  joinCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.medium,
    padding: 24,
    gap: 16,
  },
  joinHeader: {
    alignItems: "center",
    gap: 6,
  },
  joinTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text.primary,
    textAlign: "center",
  },
  joinSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: "center",
  },
  codePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    alignSelf: "flex-start",
  },
  codePillLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text.faint,
  },
  codePillVal: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.accent.primary,
    fontFamily: "monospace",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    padding: 8,
  },
  errorText: {
    fontSize: 11,
    color: colors.status.error,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.text.faint,
    letterSpacing: 1.2,
  },
  nameInput: {
    backgroundColor: colors.bg.base,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
  },
  enterBtn: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  enterBtnDisabled: {
    opacity: 0.6,
  },
  enterBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.bg.base,
  },
  privacyNote: {
    fontSize: 10,
    color: colors.text.faint,
    textAlign: "center",
  },
  syncToastBox: {
    position: "absolute",
    bottom: 72,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(19, 23, 28, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(229, 184, 105, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 20,
  },
  syncToastText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.primary,
  },
});
