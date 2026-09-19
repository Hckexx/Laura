import { fetchFromAPI } from './client';
import type { MediaItem, TVDetails, TVSeasonDetails, CastMember, VideoItem } from '../../types/media';
import type { Genre } from '../../types/genres';

// Fetch trending TV shows
export async function fetchTrendingTVShows(): Promise<MediaItem[]> {
  const data = await fetchFromAPI('/trending/tv');
  return data.data || [];
}

// Fetch popular TV shows
export async function fetchPopularTVShows(): Promise<MediaItem[]> {
  const data = await fetchFromAPI('/tv/popular');
  return data.data || [];
}

// Fetch top rated TV shows
export async function fetchTopRatedTVShows(): Promise<MediaItem[]> {
  const data = await fetchFromAPI('/tv/top-rated');
  return data.data || [];
}

// Fetch airing today TV shows
export async function fetchAiringTodayTV(): Promise<MediaItem[]> {
  const data = await fetchFromAPI('/tv/airing-today');
  return data.data || [];
}

// Fetch TV show details
export async function fetchTVDetails(id: number): Promise<TVDetails> {
  const data = await fetchFromAPI(`/tv/${id}`);
  return data.data || data;
}

// Fetch TV credits
export async function fetchTVCredits(id: number): Promise<{ cast: CastMember[] }> {
  const data = await fetchFromAPI(`/tv/${id}/credits`);
  return data.data || data;
}

// Fetch similar TV shows
export async function fetchSimilarTVShows(id: number): Promise<MediaItem[]> {
  const data = await fetchFromAPI(`/tv/${id}/similar`);
  return data.data || data.results || [];
}

// Fetch TV videos (trailers)
export async function fetchTVVideos(id: number): Promise<VideoItem[]> {
  const data = await fetchFromAPI(`/tv/${id}/videos`);
  return data.data || data.results || [];
}

// Fetch TV season details (supports season 0 for specials)
export async function fetchTVSeason(tvId: number, seasonNumber: number): Promise<TVSeasonDetails> {
  const data = await fetchFromAPI(`/tv/${tvId}/season/${seasonNumber}`);
  return data.data || data;
}

// Fetch TV genres
export async function fetchTVGenres(): Promise<Genre[]> {
  const data = await fetchFromAPI('/tv/genres');
  return Array.isArray(data) ? data : data.data || [];
}

// Fetch TV shows by genre
export async function fetchTVShowsByGenre(genreId: number): Promise<MediaItem[]> {
  const data = await fetchFromAPI(`/discover/tv?with_genres=${genreId}`);
  return data.data || data.results || [];
}
