import { fetchFromAPI } from './client'

// ==================== TRENDING & MOVIES ====================

// Fetch trending movies
export async function fetchTrendingMovies() {
  const data = await fetchFromAPI('/trending/movies')
  return data.data || []
}

// Fetch popular movies
export async function fetchPopularMovies() {
  const data = await fetchFromAPI('/movies/popular')
  return data.data || []
}

// Fetch top rated movies
export async function fetchTopRatedMovies() {
  const data = await fetchFromAPI('/movies/top-rated')
  return data.data || []
}

// Fetch upcoming movies
export async function fetchUpcomingMovies() {
  const data = await fetchFromAPI('/movies/upcoming')
  return data.data || []
}

// Fetch now playing movies
export async function fetchNowPlayingMovies() {
  const data = await fetchFromAPI('/movies/now-playing')
  return data.data || []
}

// Fetch movie details
export async function fetchMovieDetails(id: number) {
  const data = await fetchFromAPI(`/movies/${id}`)
  return data.data || data
}

// Fetch movie credits
export async function fetchMovieCredits(id: number) {
  const data = await fetchFromAPI(`/movies/${id}/credits`)
  return data.data || data
}

// Fetch similar movies
export async function fetchSimilarMovies(id: number) {
  const data = await fetchFromAPI(`/movies/${id}/similar`)
  return data.data || data.results || []
}

// Fetch movie videos
export async function fetchMovieVideos(id: number) {
  const data = await fetchFromAPI(`/movies/${id}/videos`)
  return data.data || data.results || []
}

// Fetch movie genres
export async function fetchMovieGenres() {
  const data = await fetchFromAPI('/movies/genres')
  return data.data || data
}

// Fetch movies by genre
export async function fetchMoviesByGenre(genreId: number) {
  const data = await fetchFromAPI(`/discover/movie?with_genres=${genreId}`)
  return data.data || data.results || []
}

export async function fetchMoviesByFilters(filters: Record<string, string>) {
  const params = new URLSearchParams(filters)
  const data = await fetchFromAPI(`/discover/movie/filter?${params.toString()}`)
  return data.data || data.results || []
}

// Fetch stream/watch URL for a movie or TV episode (Legacy helper)
export async function fetchWatchUrl(mediaId: number, mediaType: string, season?: number, episode?: number) {
  let endpoint = ''
  
  if (mediaType === 'movie') {
    endpoint = `/movies/${mediaId}/watch`
  } else if (mediaType === 'tv') {
    if (season && episode) {
      endpoint = `/tv/${mediaId}/season/${season}/episode/${episode}/watch`
    } else {
      endpoint = `/tv/${mediaId}/watch`
    }
  }
  
  const data = await fetchFromAPI(endpoint)
  return data.data || data
}
