import { fetchFromAPI } from './client';
import { searchWithExactId } from './search-merge';
import type { MediaItem } from '../../types/media';

const resultsFrom = (data: { data?: MediaItem[]; results?: MediaItem[] }): MediaItem[] =>
  data.data || data.results || [];

const detailFrom = (data: { data?: MediaItem } & MediaItem): MediaItem =>
  data.data || data;

// Search movies (with hidden numeric TMDB ID lookup fallback)
export async function searchMovies(query: string): Promise<MediaItem[]> {
  return searchWithExactId(
    query,
    async () => resultsFrom(await fetchFromAPI(`/search/movie?query=${encodeURIComponent(query)}`)),
    async (id) => detailFrom(await fetchFromAPI(`/movies/${id}`)),
  );
}

// Search TV shows (with hidden numeric TMDB ID lookup fallback)
export async function searchTVShows(query: string): Promise<MediaItem[]> {
  return searchWithExactId(
    query,
    async () => resultsFrom(await fetchFromAPI(`/search/tv?query=${encodeURIComponent(query)}`)),
    async (id) => detailFrom(await fetchFromAPI(`/tv/${id}`)),
  );
}

// Multi search across both movies and TV shows
export async function searchMulti(
  query: string,
): Promise<{ results: MediaItem[] }> {
  const [movies, tvShows] = await Promise.all([
    searchMovies(query).catch(() => []),
    searchTVShows(query).catch(() => []),
  ]);

  const taggedMovies = movies.map((m) => ({ ...m, media_type: 'movie' as const }));
  const taggedTV = tvShows.map((t) => ({ ...t, media_type: 'tv' as const }));

  return {
    results: [...taggedMovies, ...taggedTV],
  };
}

