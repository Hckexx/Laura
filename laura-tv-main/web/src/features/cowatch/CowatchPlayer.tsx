import { useCallback, useEffect, useRef, useState } from 'react'
import { providers } from '../player/providers'
import {
  buildCowatchEmbedUrl,
  createProviderCommand,
  estimateClientTime,
  getPlaybackActionMode,
  parseProviderWindowMessage,
  providerAdapters,
  shouldForwardProviderEvent,
} from './player-adapters'
import {
  applyObservedPlayerEvent,
  buildHostTimelineReport,
  consumeExpectedProviderEcho,
  derivePlayerSyncState,
  hasPendingExpectedPlaybackEcho,
  initialObservedPlaybackState,
  queueExpectedProviderEcho,
  updateIframeInstance,
} from './player-state'
import type { ExpectedProviderEcho, IframeInstanceState, PlayerLoadState } from './player-state'
import type { CowatchMedia, CowatchPlayback, CowatchPlaybackRequest } from './types'
import MediaPicker from './MediaPicker'

type Props = {
  media: CowatchMedia | null
  playback: CowatchPlayback
  participantId: string
  isHost: boolean
  syncIntervalMs: number
  driftToleranceSeconds: number
  resyncKey: number
  isFullscreen?: boolean
  overlaysVisible?: boolean
  onOverlayHoverChange?: (hovered: boolean) => void
  onMediaChange: (media: CowatchMedia) => void
  onPlay: (request: CowatchPlaybackRequest) => void
  onPause: (request: CowatchPlaybackRequest) => void
  onSeek: (currentTime: number, request: CowatchPlaybackRequest) => void
  onTimeline: (currentTime: number, playing: boolean) => void
}

const DIRECT_RETRY_DELAYS_MS = [250, 500, 1_000] as const
const EXPECTED_ECHO_TTL_MS = 3_000

const newPlaybackRequest = (locallyApplied: boolean): CowatchPlaybackRequest => ({
  actionId: globalThis.crypto?.randomUUID?.() ?? `playback-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  locallyApplied,
})

function CowatchPlayer({
  media,
  playback,
  participantId,
  isHost,
  syncIntervalMs,
  driftToleranceSeconds,
  resyncKey,
  isFullscreen = false,
  overlaysVisible = true,
  onOverlayHoverChange,
  onMediaChange,
  onPlay,
  onPause,
  onSeek,
  onTimeline,
}: Props) {
  const [iframe, setIframe] = useState<IframeInstanceState>(() => ({
    src: media ? buildCowatchEmbedUrl(media, playback) : undefined,
    revision: 0,
  }))
  const [observedPlayback, setObservedPlayback] = useState(initialObservedPlaybackState)
  const [playbackUnlockAttempted, setPlaybackUnlockAttempted] = useState(false)
  const [loadState, setLoadState] = useState<PlayerLoadState>(media ? 'loading' : 'idle')
  const [correctionExhausted, setCorrectionExhausted] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const observedPlaybackRef = useRef(observedPlayback)
  const correctionAtRef = useRef(0)
  const correctionAttemptsRef = useRef(0)
  const expectedEchoesRef = useRef<ExpectedProviderEcho[]>([])
  const locallyAppliedActionIdsRef = useRef(new Set<string>())
  const processedActionIdRef = useRef<string | undefined>(undefined)
  const latestMediaRef = useRef(media)
  const latestPlaybackRef = useRef(playback)
  const directRetryTimerRef = useRef<number | undefined>(undefined)
  const directEventObservedRef = useRef(false)
  const lastResyncKeyRef = useRef(resyncKey)
  const mediaKey = media ? `${media.type}:${media.id}:${media.season ?? ''}:${media.episode ?? ''}:${media.providerId}` : ''
  const activeProvider = providers.find((provider) => provider.id === media?.providerId) ?? providers[0]
  const capabilities = providerAdapters[activeProvider.id]
  const providerId = media?.providerId

  const rememberExpectedEcho = useCallback((event: Pick<ExpectedProviderEcho, 'actionId' | 'type' | 'currentTime'>) => {
    const now = Date.now()
    expectedEchoesRef.current = queueExpectedProviderEcho(expectedEchoesRef.current, {
      ...event,
      expiresAt: now + EXPECTED_ECHO_TTL_MS,
    }, now)
  }, [])

  const stopDirectConvergence = useCallback(() => {
    if (directRetryTimerRef.current !== undefined) window.clearTimeout(directRetryTimerRef.current)
    directRetryTimerRef.current = undefined
  }, [])

  const startDirectConvergence = useCallback(() => {
    stopDirectConvergence()
    let attemptIndex = 0
    const applyLatestState = () => {
      const currentMedia = latestMediaRef.current
      const currentPlayback = latestPlaybackRef.current
      const target = iframeRef.current?.contentWindow
      if (!currentMedia || !target || !providerAdapters[currentMedia.providerId].canReceiveDirectCommands) return

      const actionId = currentPlayback.actionId ?? `converge:${currentPlayback.updatedAt}`
      const currentTime = estimateClientTime(currentPlayback)
      rememberExpectedEcho({ actionId, type: 'seek', currentTime })
      rememberExpectedEcho({ actionId, type: currentPlayback.playing ? 'play' : 'pause' })
      const seek = createProviderCommand(currentMedia.providerId, { command: 'seek', value: currentTime })
      const playState = createProviderCommand(currentMedia.providerId, { command: currentPlayback.playing ? 'play' : 'pause' })
      if (seek) target.postMessage(seek.message, seek.targetOrigin)
      if (playState) target.postMessage(playState.message, playState.targetOrigin)

      const delay = DIRECT_RETRY_DELAYS_MS[attemptIndex]
      attemptIndex += 1
      if (delay !== undefined) directRetryTimerRef.current = window.setTimeout(applyLatestState, delay)
      else directRetryTimerRef.current = undefined
    }
    applyLatestState()
  }, [rememberExpectedEcho, stopDirectConvergence])

  const loadProvider = useCallback((currentMedia: CowatchMedia, currentPlayback: CowatchPlayback, forceRemount: boolean, actionId?: string) => {
    const targetTime = estimateClientTime(currentPlayback)
    if (actionId) {
      rememberExpectedEcho({ actionId, type: currentPlayback.playing ? 'play' : 'pause' })
      rememberExpectedEcho({ actionId, type: 'seek', currentTime: targetTime })
    }
    setIframe((current) => updateIframeInstance(current, buildCowatchEmbedUrl(currentMedia, currentPlayback), forceRemount))
    setLoadState('loading')
  }, [rememberExpectedEcho])

  useEffect(() => {
    latestMediaRef.current = media
    latestPlaybackRef.current = playback
  }, [media, playback])

  useEffect(() => {
    const currentMedia = latestMediaRef.current
    const currentPlayback = latestPlaybackRef.current
    const forceRemount = lastResyncKeyRef.current !== resyncKey
    lastResyncKeyRef.current = resyncKey
    stopDirectConvergence()
    const initialObserved = initialObservedPlaybackState()
    observedPlaybackRef.current = initialObserved
    setObservedPlayback(initialObserved)
    setPlaybackUnlockAttempted(false)
    correctionAttemptsRef.current = 0
    setCorrectionExhausted(false)
    directEventObservedRef.current = false
    expectedEchoesRef.current = []
    if (currentMedia) loadProvider(currentMedia, currentPlayback, forceRemount)
    else {
      setIframe((current) => updateIframeInstance(current, undefined, forceRemount))
      setLoadState('idle')
    }
  }, [loadProvider, mediaKey, resyncKey, stopDirectConvergence])

  useEffect(() => {
    const currentMedia = latestMediaRef.current
    const currentPlayback = latestPlaybackRef.current
    const actionId = currentPlayback.actionId
    if (!currentMedia || !actionId || processedActionIdRef.current === actionId) return
    processedActionIdRef.current = actionId
    const mode = getPlaybackActionMode(currentMedia.providerId, currentPlayback, participantId, locallyAppliedActionIdsRef.current)
    if (mode === 'none') {
      if (currentPlayback.sourceActionId) locallyAppliedActionIdsRef.current.delete(currentPlayback.sourceActionId)
      return
    }
    if (mode === 'direct') {
      startDirectConvergence()
      return
    }
    loadProvider(currentMedia, currentPlayback, true, actionId)
  }, [loadProvider, mediaKey, participantId, playback.actionId, startDirectConvergence])

  useEffect(() => {
    if (!iframe.src || loadState !== 'loading') return
    const timer = window.setTimeout(() => setLoadState('failed'), 15_000)
    return () => window.clearTimeout(timer)
  }, [iframe.revision, iframe.src, loadState])

  useEffect(() => {
    if (!providerId) return
    const onMessage = (event: MessageEvent) => {
      const playerEvent = parseProviderWindowMessage(providerId, iframeRef.current?.contentWindow ?? null, event)
      if (!playerEvent) return
      const now = Date.now()
      setLoadState('ready')
      const observed = applyObservedPlayerEvent(observedPlaybackRef.current, playerEvent, latestPlaybackRef.current.playing, now)
      observedPlaybackRef.current = observed
      setObservedPlayback(observed)

      if (providerAdapters[providerId].canReceiveDirectCommands) {
        const expectedPlaying = latestPlaybackRef.current.playing
        if ((playerEvent.type === 'play' && expectedPlaying) || ((playerEvent.type === 'pause' || playerEvent.type === 'ended') && !expectedPlaying)) {
          stopDirectConvergence()
        }
        if (!directEventObservedRef.current) {
          directEventObservedRef.current = true
          startDirectConvergence()
        }
      }

      const awaitingPlaybackEcho = hasPendingExpectedPlaybackEcho(expectedEchoesRef.current, now)
      const consumed = consumeExpectedProviderEcho(expectedEchoesRef.current, playerEvent, now)
      expectedEchoesRef.current = consumed.remaining
      if (!shouldForwardProviderEvent(playerEvent, latestPlaybackRef.current, isHost, consumed.suppressed || awaitingPlaybackEcho)) return
      if (playerEvent.type === 'play') {
        const request = newPlaybackRequest(true)
        locallyAppliedActionIdsRef.current.add(request.actionId)
        onPlay(request)
      }
      if (playerEvent.type === 'pause' || playerEvent.type === 'ended') {
        const request = newPlaybackRequest(true)
        locallyAppliedActionIdsRef.current.add(request.actionId)
        onPause(request)
      }
      if (playerEvent.type === 'seek' && playerEvent.currentTime !== undefined) {
        const request = newPlaybackRequest(true)
        locallyAppliedActionIdsRef.current.add(request.actionId)
        onSeek(playerEvent.currentTime, request)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [isHost, onPause, onPlay, onSeek, providerId, startDirectConvergence, stopDirectConvergence])

  useEffect(() => {
    if (!isHost || !latestMediaRef.current) return
    const timer = window.setInterval(() => {
      const currentMedia = latestMediaRef.current
      if (!currentMedia) return
      const report = buildHostTimelineReport(
        latestPlaybackRef.current,
        observedPlaybackRef.current,
        providerAdapters[currentMedia.providerId],
      )
      onTimeline(report.currentTime, report.playing)
    }, syncIntervalMs)
    return () => window.clearInterval(timer)
  }, [isHost, mediaKey, onTimeline, syncIntervalMs])

  useEffect(() => {
    const localTime = observedPlaybackRef.current.currentTime
    if (!media || isHost || !capabilities.canObserveTime || localTime === undefined) return
    const target = estimateClientTime(playback)
    if (Math.abs(localTime - target) <= driftToleranceSeconds) {
      correctionAttemptsRef.current = 0
      setCorrectionExhausted(false)
      return
    }
    if (Date.now() - correctionAtRef.current < Math.max(5_000, syncIntervalMs * 2)) return
    correctionAtRef.current = Date.now()
    if (capabilities.canReceiveDirectCommands) {
      startDirectConvergence()
      return
    }
    if (!capabilities.canStartAtTimestamp) return
    if (correctionAttemptsRef.current >= 2) {
      setCorrectionExhausted(true)
      return
    }
    correctionAttemptsRef.current += 1
    loadProvider(media, playback, true, `drift:${playback.updatedAt}`)
  }, [capabilities.canObserveTime, capabilities.canReceiveDirectCommands, capabilities.canStartAtTimestamp, driftToleranceSeconds, isHost, loadProvider, media, playback, startDirectConvergence, syncIntervalMs])

  useEffect(() => () => stopDirectConvergence(), [stopDirectConvergence])

  const retryProvider = () => {
    if (!media) return
    const initialObserved = initialObservedPlaybackState()
    observedPlaybackRef.current = initialObserved
    setObservedPlayback(initialObserved)
    correctionAttemptsRef.current = 0
    setCorrectionExhausted(false)
    loadProvider(media, playback, true, `retry:${Date.now()}`)
  }

  const syncAndPlay = () => {
    setPlaybackUnlockAttempted(true)
    if (capabilities.canReceiveDirectCommands) startDirectConvergence()
    else if (capabilities.canStartAtTimestamp && media) loadProvider(media, playback, true, `unlock:${Date.now()}`)
  }

  const handleIframeLoad = () => {
    setLoadState('loaded')
    if (capabilities.canReceiveDirectCommands) startDirectConvergence()
  }

  const syncState = derivePlayerSyncState(playback, observedPlayback, loadState, capabilities, correctionExhausted)
  const needsPlaybackUnlock = Boolean(media && syncState === 'needs-user-gesture')
  const playerShellClass = isFullscreen
    ? 'relative h-full w-full bg-black'
    : 'overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101318] p-3 sm:p-4'

  return (
    <div className={playerShellClass}>
      <div className={isFullscreen ? 'hidden' : 'mb-4 flex flex-wrap items-center justify-between gap-2'}>
        <h2 className="text-base font-semibold text-gray-100">Shared player</h2>
        <span className="text-xs text-gray-400">Streaming with {activeProvider.name}</span>
      </div>

      {isHost && !isFullscreen ? (
        <div className="mb-4"><MediaPicker value={media} onChange={(selection) => { if (selection) onMediaChange({ ...selection, providerId: media?.providerId ?? selection.providerId }) }} /></div>
      ) : null}

      {iframe.src ? (
        <div className={isFullscreen ? 'h-full w-full' : ''}>
          <iframe ref={iframeRef} key={`${mediaKey}:${iframe.revision}`} src={iframe.src} title={`${activeProvider.name} Cowatch player`} className={isFullscreen ? 'h-full w-full border-0 bg-black' : 'aspect-video w-full rounded-lg border border-white/10 bg-black'} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="no-referrer" onLoad={handleIframeLoad} onError={() => setLoadState('failed')} />
          {loadState === 'failed' ? (
            <div role="status" className={isFullscreen ? 'absolute left-4 top-4 z-30 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-black/90 p-3 text-sm text-amber-100' : 'mt-2 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-950/30 p-3 text-sm text-amber-100'}>
              <span>The provider iframe did not finish loading. Room controls remain available.</span>
              <button type="button" onClick={retryProvider} className="rounded border border-amber-300/30 px-2 py-1">Retry</button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="aspect-video flex items-center justify-center rounded-lg bg-black text-gray-500">The host has not selected media yet.</div>
      )}

      <div className={isFullscreen ? `absolute inset-x-4 bottom-20 z-20 transition-opacity ${overlaysVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}` : ''} onMouseEnter={() => onOverlayHoverChange?.(true)} onMouseLeave={() => onOverlayHoverChange?.(false)}>
        {needsPlaybackUnlock ? (
          <div role="status" className="mt-3 rounded-lg border border-amber-500/30 bg-black/85 p-3 text-sm text-amber-100">
            <button type="button" onClick={syncAndPlay} className="rounded border border-amber-300/40 px-3 py-1.5 font-medium">{playbackUnlockAttempted ? 'Retry Sync & Play' : 'Enable Cowatch Playback'}</button>
            <span className="ml-3">The iframe loaded, but playback has not been observed. Your browser or provider may require one local tap.</span>
          </div>
        ) : null}
        {syncState === 'limited-provider' ? <p role="status" className="mt-3 text-sm text-amber-200">This provider offers limited shared playback control. Everyone stays connected while playback uses the provider's available controls.</p> : null}
      </div>
    </div>
  )
}

export default CowatchPlayer
