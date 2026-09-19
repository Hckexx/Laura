export type ProviderId = 'poseidon' | 'zeus' | 'hades' | 'erebus' | 'vidzee' | 'embedmaster' | 'vidlink'

export interface Provider {
  id: ProviderId
  name: string
  baseDomain: string
  getUrl: (mediaId: number, mediaType: string, season?: number, episode?: number) => string
}

const isValidSeason = (s: number | undefined | null): s is number =>
  s !== undefined && s !== null && Number.isInteger(s) && s >= 0

const isValidEpisode = (e: number | undefined | null): e is number =>
  e !== undefined && e !== null && Number.isInteger(e) && e >= 1

export const providers: Provider[] = [
  {
    id: 'embedmaster',
    name: 'Apollo',
    baseDomain: 'embedmaster.link',
    getUrl: (id, type, season, episode) => {
      if (type === 'movie') return `https://embedmaster.link/movie/${id}`
      if (type === 'tv' && isValidSeason(season) && isValidEpisode(episode)) return `https://embedmaster.link/tv/${id}/${season}/${episode}`
      return `https://embedmaster.link/tv/${id}`
    },
  },
  {
    id: 'vidzee',
    name: 'Athena',
    baseDomain: 'player.vidzee.wtf',
    getUrl: (id, type, season, episode) => {
      if (type === 'movie') return `https://player.vidzee.wtf/embed/movie/${id}`
      if (type === 'tv' && isValidSeason(season) && isValidEpisode(episode)) return `https://player.vidzee.wtf/embed/tv/${id}/${season}/${episode}`
      return `https://player.vidzee.wtf/embed/tv/${id}`
    },
  },
  {
    id: 'vidlink',
    name: 'Hermes',
    baseDomain: 'vidlink.pro',
    getUrl: (id, type, season, episode) => {
      if (type === 'movie') return `https://vidlink.pro/movie/${id}`
      if (type === 'tv' && isValidSeason(season) && isValidEpisode(episode)) return `https://vidlink.pro/tv/${id}/${season}/${episode}`
      return `https://vidlink.pro/tv/${id}`
    },
  },
  {
    id: 'poseidon',
    name: 'Poseidon',
    baseDomain: 'vidking.net',
    getUrl: (id, type, season, episode) => {
      if (type === 'movie') return `https://www.vidking.net/embed/movie/${id}`
      if (type === 'tv' && isValidSeason(season) && isValidEpisode(episode)) return `https://www.vidking.net/embed/tv/${id}/${season}/${episode}`
      return `https://www.vidking.net/embed/tv/${id}`
    },
  },
  {
    id: 'zeus',
    name: 'Zeus',
    baseDomain: 'vidsrc.sbs',
    getUrl: (id, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.sbs/embed/movie/${id}`
      if (type === 'tv' && isValidSeason(season) && isValidEpisode(episode)) return `https://vidsrc.sbs/embed/tv/${id}/${season}/${episode}`
      return `https://vidsrc.sbs/embed/tv/${id}`
    },
  },
  {
    id: 'hades',
    name: 'Hades',
    baseDomain: 'vidnest.fun',
    getUrl: (id, type, season, episode) => {
      if (type === 'movie') return `https://vidnest.fun/movie/${id}?server=gama`
      if (type === 'tv' && isValidSeason(season) && isValidEpisode(episode)) return `https://vidnest.fun/tv/${id}/${season}/${episode}?server=gama`
      return `https://vidnest.fun/tv/${id}?server=gama`
    },
  },
  {
    id: 'erebus',
    name: 'Erebus',
    baseDomain: 'vidcore.org',
    getUrl: (id, type, season, episode) => {
      if (type === 'movie') return `https://vidcore.org/movie/${id}`
      if (type === 'tv' && isValidSeason(season) && isValidEpisode(episode)) return `https://vidcore.org/tv/${id}/${season}/${episode}`
      return `https://vidcore.org/tv/${id}`
    },
  },
]

export const defaultProvider = providers[0]

export function getProvider(id: ProviderId): Provider {
  return providers.find((p) => p.id === id) || defaultProvider
}
