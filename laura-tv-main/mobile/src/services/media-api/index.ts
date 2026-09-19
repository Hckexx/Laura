export { fetchFromAPI } from './client';

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
} from './movies';

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
} from './tv';

export {
  searchMovies,
  searchTVShows,
  searchMulti,
} from './search';

export {
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  getStillUrl,
  getTrailerKey,
} from './helpers';

export {
  providers,
  defaultProvider,
  getProvider,
} from './providers';
