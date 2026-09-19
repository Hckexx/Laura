export { fetchFromAPI } from './client'

export {
  fetchTrendingMovies,
  fetchPopularMovies,
  fetchTopRatedMovies,
  fetchUpcomingMovies,
  fetchNowPlayingMovies,
  fetchMovieDetails,
  fetchMovieCredits,
  fetchSimilarMovies,
  fetchMovieVideos,
  fetchMovieGenres,
  fetchMoviesByGenre,
  fetchMoviesByFilters,
  fetchWatchUrl,
} from './movies'

export {
  fetchTrendingTVShows,
  fetchPopularTVShows,
  fetchTopRatedTVShows,
  fetchAiringTodayTV,
  fetchTVDetails,
  fetchTVCredits,
  fetchSimilarTVShows,
  fetchTVVideos,
  fetchTVSeason,
  fetchTVGenres,
  fetchTVShowsByGenre,
} from './tv'

export {
  searchMovies,
  searchTVShows,
} from './search'

export {
  getPosterUrl,
  getBackdropUrl,
  getTrailerKey,
} from './helpers'
