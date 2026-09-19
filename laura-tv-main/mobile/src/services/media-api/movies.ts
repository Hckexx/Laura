import { fetchFromAPI } from './client';
import type { MediaItem, MovieDetails, CastMember, VideoItem } from '../../types/media';
import type { Genre } from '../../types/genres';

// Fetch trending movies
export async function fetchTrendingMovies(): Promise<MediaItem[]> {
  const data = await fetchFromAPI('/trending/movies');
  return data.data || [];
}

// Fetch popular movies
export async function fetchPopularMovies(): Promise<MediaItem[]> {
  const data = await fetchFromAPI('/movies/popular');
  return data.data || [];
}

// Fetch top rated movies
export async function fetchTopRatedMovies(): Promise<MediaItem[]> {
  const data = await fetchFromAPI('/movies/top-rated');
  return data.data || [];
}

// Fetch upcoming movies
export async function fetchUpcomingMovies(): Promise<MediaItem[]> {
  const data = await fetchFromAPI('/movies/upcoming');
  return data.data || [];
}

// Fetch now playing movies
export async function fetchNowPlayingMovies(): Promise<MediaItem[]> {
  const data = await fetchFromAPI('/movies/now-playing');
  return data.data || [];
}

// Fetch movie details
export async function fetchMovieDetails(id: number): Promise<MovieDetails> {
  const data = await fetchFromAPI(`/movies/${id}`);
  return data.data || data;
}

// Fetch movie credits
export async function fetchMovieCredits(id: number): Promise<{ cast: CastMember[] }> {
  const data = await fetchFromAPI(`/movies/${id}/credits`);
  return data.data || data;
}

// Fetch similar movies
export async function fetchSimilarMovies(id: number): Promise<MediaItem[]> {
  const data = await fetchFromAPI(`/movies/${id}/similar`);
  return data.data || data.results || [];
}

// Fetch movie videos (trailers)
export async function fetchMovieVideos(id: number): Promise<VideoItem[]> {
  const data = await fetchFromAPI(`/movies/${id}/videos`);
  return data.data || data.results || [];
}

// Fetch movie genres
export async function fetchMovieGenres(): Promise<Genre[]> {
  const data = await fetchFromAPI('/movies/genres');
  return Array.isArray(data) ? data : data.data || [];
}

// Fetch movies by genre
export async function fetchMoviesByGenre(genreId: number): Promise<MediaItem[]> {
  const data = await fetchFromAPI(`/discover/movie?with_genres=${genreId}`);
  return data.data || data.results || [];
}
