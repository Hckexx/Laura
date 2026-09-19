import { fetchFromAPI } from './client'
import { searchWithExactId } from './search-merge'

// ==================== SEARCH ====================

export type MediaSearchResult = {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  media_type?: 'movie' | 'tv'
  vote_average?: number
  release_date?: string
  first_air_date?: string
  genre_ids?: number[]
}

const resultsFrom = (data: { data?: MediaSearchResult[]; results?: MediaSearchResult[] }): MediaSearchResult[] => data.data || data.results || []
const detailFrom = (data: { data?: MediaSearchResult } & MediaSearchResult): MediaSearchResult => data.data || data

// Search movies (preserves hidden numeric TMDB ID lookup)
export async function searchMovies(query: string) {
  return searchWithExactId(
    query,
    async () => resultsFrom(await fetchFromAPI(`/search/movie?query=${encodeURIComponent(query)}`)),
    async (id) => detailFrom(await fetchFromAPI(`/movies/${id}`)),
  )
}

// Search TV shows (preserves hidden numeric TMDB ID lookup)
export async function searchTVShows(query: string) {
  return searchWithExactId(
    query,
    async () => resultsFrom(await fetchFromAPI(`/search/tv?query=${encodeURIComponent(query)}`)),
    async (id) => detailFrom(await fetchFromAPI(`/tv/${id}`)),
  )
}
