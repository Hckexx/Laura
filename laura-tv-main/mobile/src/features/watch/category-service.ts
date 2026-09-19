import {
  fetchAiringTodayTV,
  fetchMoviesByGenre,
  fetchNowPlayingMovies,
  fetchPopularMovies,
  fetchPopularTVShows,
  fetchTopRatedMovies,
  fetchTopRatedTVShows,
  fetchTrendingMovies,
  fetchTrendingTVShows,
  fetchTVShowsByGenre,
} from '../../services/media-api';
import type { MediaItem, MediaType } from '../../types/media';
import type { WatchCategory, WatchCategorySource } from './categories';

export type WatchDiscoveryItem = MediaItem & {
  media_type: MediaType;
};

const fetchSource = async (source: WatchCategorySource): Promise<WatchDiscoveryItem[]> => {
  let mediaType: MediaType;
  let items: MediaItem[];

  switch (source.kind) {
    case 'trending-movies': mediaType = 'movie'; items = await fetchTrendingMovies(); break;
    case 'trending-tv': mediaType = 'tv'; items = await fetchTrendingTVShows(); break;
    case 'popular-movies': mediaType = 'movie'; items = await fetchPopularMovies(); break;
    case 'popular-tv': mediaType = 'tv'; items = await fetchPopularTVShows(); break;
    case 'top-rated-movies': mediaType = 'movie'; items = await fetchTopRatedMovies(); break;
    case 'top-rated-tv': mediaType = 'tv'; items = await fetchTopRatedTVShows(); break;
    case 'now-playing-movies': mediaType = 'movie'; items = await fetchNowPlayingMovies(); break;
    case 'airing-today-tv': mediaType = 'tv'; items = await fetchAiringTodayTV(); break;
    case 'movie-genre': mediaType = 'movie'; items = await fetchMoviesByGenre(source.genreId); break;
    case 'tv-genre': mediaType = 'tv'; items = await fetchTVShowsByGenre(source.genreId); break;
  }

  return items
    .filter((item) => Boolean(item?.id && item.poster_path))
    .map((item) => ({ ...item, media_type: mediaType }));
};

const interleave = (groups: WatchDiscoveryItem[][]) => {
  const items: WatchDiscoveryItem[] = [];
  const maxLength = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < maxLength; index += 1) {
    for (const group of groups) {
      if (group[index]) items.push(group[index]);
    }
  }
  return items;
};

export async function fetchWatchCategory(category: WatchCategory): Promise<WatchDiscoveryItem[]> {
  const settled = await Promise.allSettled(category.sources.map(fetchSource));
  const successful = settled
    .filter((result): result is PromiseFulfilledResult<WatchDiscoveryItem[]> => result.status === 'fulfilled')
    .map((result) => result.value);
  if (successful.length === 0) throw new Error(`Unable to load ${category.title}`);

  const seen = new Set<string>();
  return interleave(successful).filter((item) => {
    const key = `${item.media_type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
