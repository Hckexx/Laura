import type { CowatchPlayback, CowatchPlayerEvent } from './types'
import type { ProviderCapabilities } from './player-adapters'

export type ObservedPlaybackStatus = 'unknown' | 'playing' | 'paused'

export type ObservedPlaybackState = {
  status: ObservedPlaybackStatus
  currentTime?: number
  observedAt?: number
  lastProgressAt?: number
  playingEvidenceAt?: number
  forwardProgressCount: number
}

export type PlayerLoadState = 'idle' | 'loading' | 'loaded' | 'ready' | 'failed'
export type PlayerSyncState = 'synced' | 'converging' | 'needs-user-gesture' | 'limited-provider' | 'failed'

export type IframeInstanceState = {
  src?: string
  revision: number
}

export type ExpectedProviderEcho = {
  actionId: string
  type: 'play' | 'pause' | 'seek'
  currentTime?: number
  expiresAt: number
}

export const initialObservedPlaybackState = (): ObservedPlaybackState => ({
  status: 'unknown',
  forwardProgressCount: 0,
})

export const applyObservedPlayerEvent = (
  previous: ObservedPlaybackState,
  event: CowatchPlayerEvent,
  roomExpectsPlaying: boolean,
  now = Date.now(),
): ObservedPlaybackState => {
  if (event.type === 'play') {
    return { ...previous, status: 'playing', observedAt: now, playingEvidenceAt: now }
  }
  if (event.type === 'pause' || event.type === 'ended') {
    return { ...previous, status: 'paused', observedAt: now, forwardProgressCount: 0 }
  }
  if (event.currentTime === undefined) return previous
  if (event.type === 'seek') {
    return { ...previous, currentTime: event.currentTime, observedAt: now, forwardProgressCount: 0 }
  }

  const recentSample = previous.observedAt !== undefined && now - previous.observedAt <= 5_000
  const advanced = previous.currentTime !== undefined && event.currentTime > previous.currentTime + 0.05
  const forwardProgressCount = recentSample && advanced ? previous.forwardProgressCount + 1 : 0
  const progressionConfirmsPlaying = roomExpectsPlaying && forwardProgressCount >= 2
  return {
    ...previous,
    status: progressionConfirmsPlaying ? 'playing' : previous.status,
    currentTime: event.currentTime,
    observedAt: now,
    lastProgressAt: advanced ? now : previous.lastProgressAt,
    playingEvidenceAt: progressionConfirmsPlaying || (previous.status === 'playing' && advanced) ? now : previous.playingEvidenceAt,
    forwardProgressCount,
  }
}

export const isObservedPlaybackActive = (
  observed: ObservedPlaybackState,
  capabilities: ProviderCapabilities,
  now = Date.now(),
  staleAfterMs = 7_500,
) => {
  if (observed.status !== 'playing') return false
  if (!capabilities.canObserveTime) return true
  return observed.playingEvidenceAt !== undefined && now - observed.playingEvidenceAt <= staleAfterMs
}

export const buildHostTimelineReport = (
  playback: CowatchPlayback,
  observed: ObservedPlaybackState,
  capabilities: ProviderCapabilities,
  now = Date.now(),
  staleAfterMs = 7_500,
) => {
  if (!capabilities.canObservePlayPause) {
    return {
      currentTime: playback.playing ? playback.currentTime + Math.max(0, now - playback.updatedAt) / 1_000 : playback.currentTime,
      playing: playback.playing,
    }
  }
  return {
    currentTime: observed.currentTime ?? playback.currentTime,
    playing: isObservedPlaybackActive(observed, capabilities, now, staleAfterMs),
  }
}

export const derivePlayerSyncState = (
  playback: CowatchPlayback,
  observed: ObservedPlaybackState,
  loadState: PlayerLoadState,
  capabilities: ProviderCapabilities,
  correctionExhausted = false,
  now = Date.now(),
): PlayerSyncState => {
  if (loadState === 'failed') return 'failed'
  if (capabilities.syncQuality === 'limited') return 'limited-provider'
  if (loadState === 'idle' || loadState === 'loading') return 'converging'
  if (correctionExhausted) return 'failed'
  if (playback.playing && capabilities.canObservePlayPause && !isObservedPlaybackActive(observed, capabilities, now)) {
    return 'needs-user-gesture'
  }
  if (!playback.playing && observed.status === 'playing') return 'converging'
  if (capabilities.canObservePlayPause) return 'synced'
  return 'converging'
}

export const updateIframeInstance = (current: IframeInstanceState, src: string | undefined, forceRemount = false): IframeInstanceState => {
  if (!forceRemount && current.src === src) return current
  return { src, revision: current.revision + 1 }
}

export const queueExpectedProviderEcho = (echoes: readonly ExpectedProviderEcho[], echo: ExpectedProviderEcho, now = Date.now()) => [
  ...echoes.filter((candidate) => candidate.type !== echo.type && candidate.expiresAt > now),
  echo,
]

export const consumeExpectedProviderEcho = (
  echoes: readonly ExpectedProviderEcho[],
  event: CowatchPlayerEvent,
  now = Date.now(),
  seekToleranceSeconds = 3,
) => {
  const active = echoes.filter(({ expiresAt }) => expiresAt > now)
  const index = active.findIndex((echo) => {
    if (echo.type !== event.type) return false
    if (echo.type !== 'seek' || echo.currentTime === undefined) return true
    return event.currentTime !== undefined && Math.abs(event.currentTime - echo.currentTime) <= seekToleranceSeconds
  })
  if (index < 0) return { suppressed: false, remaining: active }
  return { suppressed: true, remaining: active.filter((_, candidateIndex) => candidateIndex !== index) }
}

export const hasPendingExpectedPlaybackEcho = (
  echoes: readonly ExpectedProviderEcho[],
  now = Date.now(),
) => echoes.some(({ type, expiresAt }) => (type === 'play' || type === 'pause') && expiresAt > now)
