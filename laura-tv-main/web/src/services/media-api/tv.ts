import { fetchFromAPI } from './client'

// ==================== TV SHOWS ====================

// Fetch trending TV shows
export async function fetchTrendingTVShows() {
  const data = await fetchFromAPI('/trending/tv')
  return data.data || []
}

// Fetch popular TV shows
export async function fetchPopularTVShows() {
  const data = await fetchFromAPI('/tv/popular')
  return data.data || []
}

// Fetch top rated TV shows
export async function fetchTopRatedTVShows() {
  const data = await fetchFromAPI('/tv/top-rated')
  return data.data || []
}

// Fetch airing today TV
export async function fetchAiringTodayTV() {
  const data = await fetchFromAPI('/tv/airing-today')
  return data.data || []
}

// Fetch TV show details
export async function fetchTVDetails(id: number) {
  const data = await fetchFromAPI(`/tv/${id}`)
  return data.data || data
}

// Fetch TV credits
export async function fetchTVCredits(id: number) {
  const data = await fetchFromAPI(`/tv/${id}/credits`)
  return data.data || data
}

// Fetch similar TV shows
export async function fetchSimilarTVShows(id: number) {
  const data = await fetchFromAPI(`/tv/${id}/similar`)
  return data.data || data.results || []
}

// Fetch TV videos
export async function fetchTVVideos(id: number) {
  const data = await fetchFromAPI(`/tv/${id}/videos`)
  return data.data || data.results || []
}

// Fetch TV season details
export async function fetchTVSeason(tvId: number, seasonNumber: number) {
  const data = await fetchFromAPI(`/tv/${tvId}/season/${seasonNumber}`)
  return data.data || data
}

// Fetch TV genres
export async function fetchTVGenres() {
  const data = await fetchFromAPI('/tv/genres')
  return data.data || data
}

// Fetch TV shows by genre
export async function fetchTVShowsByGenre(genreId: number) {
  const data = await fetchFromAPI(`/discover/tv?with_genres=${genreId}`)
  return data.data || data.results || []
}
