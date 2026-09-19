import type { ProviderId } from '../player/providers'

export type PlaybackProgressUpdate = {
  kind: 'play' | 'pause' | 'progress' | 'ended'
  positionSeconds?: number
  durationSeconds?: number
}

const expectedOrigins: Partial<Record<ProviderId, string>> = {
  embedmaster: 'embedmaster', vidzee: 'vidzee.wtf', vidlink: 'vidlink.pro',
  poseidon: 'vidking.net', erebus: 'vidcore.org',
}
const resumeParameters: Partial<Record<ProviderId, string>> = {
  vidlink: 'startAt', poseidon: 'progress', zeus: 't', hades: 'startAt', erebus: 'startAt',
}
const seconds = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
const metrics = (data: Record<string, unknown>) => ({
  ...(seconds(data.currentTime) !== undefined ? { positionSeconds: seconds(data.currentTime) } : {}),
  ...(seconds(data.duration) !== undefined && Number(data.duration) > 0 ? { durationSeconds: seconds(data.duration) } : {}),
})
const decode = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

export function parsePlaybackMessage(providerId: ProviderId, event: MessageEvent): PlaybackProgressUpdate | null {
  const expected = expectedOrigins[providerId]
  if (expected && event.origin && !event.origin.includes(expected)) return null
  const decoded = decode(event.data)
  if (providerId === 'erebus' && typeof decoded === 'string') {
    if (decoded === 'vidcore:play') return { kind: 'play' }
    if (decoded === 'vidcore:pause') return { kind: 'pause' }
    if (decoded === 'vidcore:ended') return { kind: 'ended' }
    return null
  }
  if (!decoded || typeof decoded !== 'object') return null
  const message = decoded as Record<string, unknown>
  if (providerId === 'embedmaster' && message.source === 'embedmaster_player') {
    const info = message.info && typeof message.info === 'object' ? message.info as Record<string, unknown> : {}
    if (message.event === 'play' || message.event === 'pause' || message.event === 'ended') return { kind: message.event, ...metrics(info) }
    if (message.event === 'time' || message.event === 'seek') return { kind: 'progress', ...metrics(info) }
    return null
  }
  if (message.type !== 'PLAYER_EVENT' || !message.data || typeof message.data !== 'object') return null
  const data = message.data as Record<string, unknown>
  if (data.event === 'play' || data.event === 'pause' || data.event === 'ended') return { kind: data.event, ...metrics(data) }
  if (data.event === 'timeupdate' || data.event === 'seeked') return { kind: 'progress', ...metrics(data) }
  return null
}

export function buildResumableProviderUrl(url: string, providerId: ProviderId, position?: number) {
  const parameter = resumeParameters[providerId]
  if (!parameter || position === undefined || position <= 0) return url
  return `${url}${url.includes('?') ? '&' : '?'}${parameter}=${encodeURIComponent(position.toFixed(1))}`
}
