import type { CowatchMedia } from './types'

export type MediaTarget = {
  type: 'movie' | 'tv'
  id: number
  season?: number
  episode?: number
}

export function mediaTargetFromSearchParams(searchParams: URLSearchParams): MediaTarget | null {
  const type = searchParams.get('type')
  const id = Number(searchParams.get('id'))
  if ((type !== 'movie' && type !== 'tv') || !Number.isInteger(id) || id <= 0) return null
  if (type === 'movie') return { type, id }
  
  const rawSeason = searchParams.get('season')
  const rawEpisode = searchParams.get('episode')
  const season = rawSeason !== null && rawSeason !== undefined ? Number(rawSeason) : NaN
  const episode = rawEpisode !== null && rawEpisode !== undefined ? Number(rawEpisode) : NaN
  
  return {
    type,
    id,
    ...(Number.isInteger(season) && season >= 0 ? { season } : {}),
    ...(Number.isInteger(episode) && episode > 0 ? { episode } : {}),
  }
}

export function completeMediaSelection(target: MediaTarget, season?: number, episode?: number): CowatchMedia | null {
  if (target.type === 'movie') return { type: 'movie', id: target.id, providerId: 'embedmaster' }
  const selectedSeason = season ?? target.season
  const selectedEpisode = episode ?? target.episode
  if (
    selectedSeason === undefined ||
    selectedSeason === null ||
    !Number.isInteger(selectedSeason) ||
    selectedSeason < 0 ||
    selectedEpisode === undefined ||
    selectedEpisode === null ||
    !Number.isInteger(selectedEpisode) ||
    selectedEpisode <= 0
  ) {
    return null
  }
  return { type: 'tv', id: target.id, season: selectedSeason, episode: selectedEpisode, providerId: 'embedmaster' }
}
