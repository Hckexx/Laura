import { providers, type ProviderId } from '../player/providers'

export type ContinueWatchingRecord = {
  mediaId: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath: string | null
  season?: number
  episode?: number
  episodeName?: string
  providerId: ProviderId
  positionSeconds?: number
  durationSeconds?: number
  updatedAt: number
}

export const CONTINUE_WATCHING_KEY = 'laura_tv_continue_watching_v1'
const providerIds = new Set(providers.map(({ id }) => id))
const optionalNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined

const normalizeRecord = (value: unknown): ContinueWatchingRecord | null => {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (!Number.isInteger(record.mediaId) || Number(record.mediaId) <= 0 ||
      (record.mediaType !== 'movie' && record.mediaType !== 'tv') ||
      typeof record.title !== 'string' || !record.title.trim() ||
      typeof record.providerId !== 'string' || !providerIds.has(record.providerId as ProviderId) ||
      typeof record.updatedAt !== 'number' || !Number.isFinite(record.updatedAt)) return null

  const season = optionalNumber(record.season)
  const episode = optionalNumber(record.episode)
  const positionSeconds = optionalNumber(record.positionSeconds)
  const durationSeconds = optionalNumber(record.durationSeconds)
  return {
    mediaId: Number(record.mediaId),
    mediaType: record.mediaType,
    title: record.title.trim(),
    posterPath: typeof record.posterPath === 'string' ? record.posterPath : null,
    providerId: record.providerId as ProviderId,
    updatedAt: record.updatedAt,
    ...(season !== undefined && Number.isInteger(season) ? { season } : {}),
    ...(episode !== undefined && Number.isInteger(episode) && episode >= 1 ? { episode } : {}),
    ...(typeof record.episodeName === 'string' && record.episodeName.trim() ? { episodeName: record.episodeName.trim() } : {}),
    ...(positionSeconds !== undefined ? { positionSeconds } : {}),
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
  }
}

export function getContinueWatching(): ContinueWatchingRecord[] {
  try {
    const raw = localStorage.getItem(CONTINUE_WATCHING_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.map(normalizeRecord).filter((item): item is ContinueWatchingRecord => item !== null).sort((a, b) => b.updatedAt - a.updatedAt)
      : []
  } catch { return [] }
}

export function upsertContinueWatching(record: ContinueWatchingRecord) {
  const updated = [record, ...getContinueWatching().filter(
    (item) => !(item.mediaId === record.mediaId && item.mediaType === record.mediaType),
  )].slice(0, 30)
  localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(updated))
  return updated
}

export function removeContinueWatching(mediaId: number, mediaType: 'movie' | 'tv') {
  const updated = getContinueWatching().filter((item) => !(item.mediaId === mediaId && item.mediaType === mediaType))
  localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(updated))
  return updated
}

export const isCompletedProgress = (position?: number, duration?: number) =>
  position !== undefined && duration !== undefined && duration > 0 && position / duration >= 0.95

export const buildContinueWatchingHref = (record: ContinueWatchingRecord) => {
  const params = [`type=${record.mediaType}`]
  if (record.season !== undefined) params.push(`season=${record.season}`)
  if (record.episode !== undefined) params.push(`episode=${record.episode}`)
  return `/watch/${record.mediaId}?${params.join('&')}`
}
