import { providers } from '../player/providers'
import type { ProviderId } from '../player/providers'
import type { CowatchMedia, CowatchPlayback, CowatchPlayerEvent } from './types'

export type ProviderCapabilities = {
  syncStrategy: 'direct-control' | 'event-assisted' | 'timestamp-sync'
  syncQuality: 'direct' | 'best-effort' | 'limited'
  canObservePlayPause: boolean
  canObserveSeek: boolean
  canObserveTime: boolean
  canStartAtTimestamp: boolean
  canAutoplay: boolean
  canReceiveDirectCommands: boolean
  origin: string
}

export type ProviderCommand = {
  message: unknown
  targetOrigin: string
}

export type ProviderPlaybackCommand =
  | { command: 'play' | 'pause' }
  | { command: 'seek' | 'volume'; value: number }

type Adapter = ProviderCapabilities & {
  startParameter?: 'progress' | 't' | 'startAt'
  autoplayParameter?: 'autoPlay' | 'autoplay'
  autoplayValue?: (playing: boolean) => string
  createCommand?: (command: ProviderPlaybackCommand) => ProviderCommand
}

const createEmbedMasterCommand = (command: ProviderPlaybackCommand): ProviderCommand => ({
  message: {
    source: 'embedmaster_player_command',
    command: command.command,
    ...('value' in command ? { value: command.value } : {}),
  },
  // The embed URL redirects to a separate player origin. Incoming messages still
  // require the exact trusted runtime origin below.
  targetOrigin: '*',
})

const adapterDefinitions: Record<ProviderId, Adapter> = {
  poseidon: {
    syncStrategy: 'event-assisted', syncQuality: 'best-effort', canObservePlayPause: true, canObserveSeek: true, canObserveTime: true,
    canStartAtTimestamp: true, canAutoplay: true, canReceiveDirectCommands: false,
    origin: 'https://www.vidking.net', startParameter: 'progress', autoplayParameter: 'autoPlay', autoplayValue: String,
  },
  zeus: {
    syncStrategy: 'timestamp-sync', syncQuality: 'best-effort', canObservePlayPause: false, canObserveSeek: false, canObserveTime: false,
    canStartAtTimestamp: true, canAutoplay: true, canReceiveDirectCommands: false,
    origin: 'https://vidsrc.sbs', startParameter: 't', autoplayParameter: 'autoplay', autoplayValue: (playing) => playing ? '1' : '0',
  },
  hades: {
    syncStrategy: 'timestamp-sync', syncQuality: 'best-effort', canObservePlayPause: false, canObserveSeek: false, canObserveTime: false,
    canStartAtTimestamp: true, canAutoplay: false, canReceiveDirectCommands: false,
    origin: 'https://vidnest.fun', startParameter: 'startAt',
  },
  erebus: {
    syncStrategy: 'event-assisted', syncQuality: 'best-effort', canObservePlayPause: true, canObserveSeek: false, canObserveTime: false,
    canStartAtTimestamp: true, canAutoplay: true, canReceiveDirectCommands: false,
    origin: 'https://vidcore.org', startParameter: 'startAt', autoplayParameter: 'autoplay', autoplayValue: String,
  },
  vidzee: {
    syncStrategy: 'event-assisted', syncQuality: 'limited', canObservePlayPause: true, canObserveSeek: true, canObserveTime: true,
    canStartAtTimestamp: false, canAutoplay: false, canReceiveDirectCommands: false,
    origin: 'https://player.vidzee.wtf',
  },
  embedmaster: {
    syncStrategy: 'direct-control', syncQuality: 'direct', canObservePlayPause: true, canObserveSeek: true, canObserveTime: true,
    canStartAtTimestamp: false, canAutoplay: false, canReceiveDirectCommands: true,
    origin: 'https://embdmstrplayer.com', createCommand: createEmbedMasterCommand,
  },
  vidlink: {
    syncStrategy: 'event-assisted', syncQuality: 'best-effort', canObservePlayPause: true, canObserveSeek: true, canObserveTime: true,
    canStartAtTimestamp: true, canAutoplay: true, canReceiveDirectCommands: false,
    origin: 'https://vidlink.pro', startParameter: 'startAt', autoplayParameter: 'autoplay', autoplayValue: String,
  },
}

export const providerAdapters = Object.fromEntries(
  providers.map(({ id }) => [id, adapterDefinitions[id]]),
) as Record<ProviderId, Adapter>

export const estimateClientTime = (playback: CowatchPlayback, now = Date.now()) => playback.playing
  ? playback.currentTime + Math.max(0, now - playback.updatedAt) / 1_000
  : playback.currentTime

export const buildCowatchEmbedUrl = (media: CowatchMedia, playback: CowatchPlayback) => {
  const provider = providers.find(({ id }) => id === media.providerId) ?? providers[0]
  const adapter = providerAdapters[media.providerId]
  const url = new URL(provider.getUrl(media.id, media.type, media.season, media.episode))
  if (adapter.startParameter) {
    url.searchParams.set(adapter.startParameter, estimateClientTime(playback).toFixed(1))
  }
  if (adapter.autoplayParameter && adapter.autoplayValue) {
    url.searchParams.set(adapter.autoplayParameter, adapter.autoplayValue(playback.playing))
  }
  return url.toString()
}

export const createProviderCommand = (providerId: ProviderId, command: ProviderPlaybackCommand) => providerAdapters[providerId].createCommand?.(command)

export const shouldReloadForPlaybackAction = (playback: CowatchPlayback, participantId: string, locallyAppliedActionIds: ReadonlySet<string>) => Boolean(
  playback.action && playback.actionId && !(playback.actorId === participantId && playback.sourceActionId && locallyAppliedActionIds.has(playback.sourceActionId)),
)

export const getPlaybackActionMode = (providerId: ProviderId, playback: CowatchPlayback, participantId: string, locallyAppliedActionIds: ReadonlySet<string>): 'none' | 'direct' | 'reload' => {
  if (!shouldReloadForPlaybackAction(playback, participantId, locallyAppliedActionIds)) return 'none'
  const adapter = providerAdapters[providerId]
  if (adapter.canReceiveDirectCommands) return 'direct'
  return adapter.canStartAtTimestamp ? 'reload' : 'none'
}

export const requiresPlaybackUnlock = (playback: CowatchPlayback, localStatus: 'unknown' | 'playing' | 'paused') => playback.playing && localStatus !== 'playing'

export const shouldForwardProviderEvent = (event: CowatchPlayerEvent, playback: CowatchPlayback, isHost: boolean, suppressed: boolean) => {
  if (suppressed) return false
  if (event.type === 'play') return !playback.playing
  if (event.type === 'pause' || event.type === 'ended') return playback.playing
  return event.type === 'seek' && isHost && event.currentTime !== undefined
}

const knownPlayerEvents = new Set(['play', 'pause', 'ended', 'seeked', 'timeupdate'])

const parsePlayerEventMessage = (value: unknown): CowatchPlayerEvent | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const message = value as { type?: unknown; data?: unknown }
  if (message.type !== 'PLAYER_EVENT' || !message.data || typeof message.data !== 'object') return undefined
  const data = message.data as { event?: unknown; currentTime?: unknown }
  if (typeof data.event !== 'string' || !knownPlayerEvents.has(data.event)) return undefined
  if (data.currentTime !== undefined && (typeof data.currentTime !== 'number' || !Number.isFinite(data.currentTime) || data.currentTime < 0)) return undefined
  return {
    type: data.event === 'seeked' ? 'seek' : data.event as CowatchPlayerEvent['type'],
    ...(typeof data.currentTime === 'number' ? { currentTime: data.currentTime } : {}),
  }
}

const embedMasterTime = (info: unknown) => {
  if (typeof info === 'number') return info
  if (!info || typeof info !== 'object') return undefined
  const value = (info as { currentTime?: unknown }).currentTime
  return typeof value === 'number' ? value : undefined
}

const parseEmbedMasterMessage = (value: unknown): CowatchPlayerEvent | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const message = value as { source?: unknown; event?: unknown; info?: unknown }
  if (message.source !== 'embedmaster_player' || typeof message.event !== 'string') return undefined
  if (message.event === 'play' || message.event === 'pause') return { type: message.event }
  if (message.event !== 'seek' && message.event !== 'time') return undefined
  const currentTime = embedMasterTime(message.info)
  if (currentTime === undefined || !Number.isFinite(currentTime) || currentTime < 0) return undefined
  return { type: message.event === 'seek' ? 'seek' : 'timeupdate', currentTime }
}

export const parseProviderMessage = (providerId: ProviderId, origin: string, value: unknown): CowatchPlayerEvent | undefined => {
  const adapter = providerAdapters[providerId]
  if (origin !== adapter.origin) return undefined
  if (providerId === 'erebus' && typeof value === 'string' && /^vidcore:(play|pause|ended)$/.test(value)) {
    return { type: value.slice('vidcore:'.length) as CowatchPlayerEvent['type'] }
  }
  if (providerId === 'embedmaster') return parseEmbedMasterMessage(value)
  if (providerId === 'vidzee' || providerId === 'vidlink') return parsePlayerEventMessage(value)
  if (providerId !== 'poseidon') return undefined

  let parsed = value
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value) } catch { return undefined }
  }
  return parsePlayerEventMessage(parsed)
}

export const parseProviderWindowMessage = (providerId: ProviderId, expectedSource: MessageEventSource | null, event: Pick<MessageEvent, 'source' | 'origin' | 'data'>) => {
  if (!expectedSource || event.source !== expectedSource) return undefined
  return parseProviderMessage(providerId, event.origin, event.data)
}
