export type WatchCategorySource =
  | { kind: 'trending-movies' | 'trending-tv' | 'popular-movies' | 'popular-tv' }
  | { kind: 'top-rated-movies' | 'top-rated-tv' | 'now-playing-movies' | 'airing-today-tv' }
  | { kind: 'movie-genre' | 'tv-genre'; genreId: number };

export type WatchCategory = {
  id: string;
  title: string;
  sources: WatchCategorySource[];
};

export const WATCH_CATEGORIES: WatchCategory[] = [
  { id: 'trending', title: 'Trending Now', sources: [{ kind: 'trending-movies' }, { kind: 'trending-tv' }] },
  { id: 'fresh', title: 'Fresh Releases', sources: [{ kind: 'now-playing-movies' }, { kind: 'airing-today-tv' }] },
  { id: 'crowd-pleasers', title: 'Crowd Pleasers', sources: [{ kind: 'top-rated-movies' }, { kind: 'top-rated-tv' }] },
  { id: 'comedy', title: 'Need a Good Laugh?', sources: [{ kind: 'movie-genre', genreId: 35 }, { kind: 'tv-genre', genreId: 35 }] },
  { id: 'episodes', title: 'One More Episode', sources: [{ kind: 'popular-tv' }, { kind: 'airing-today-tv' }] },
  { id: 'big-screen', title: 'Big Screen Energy', sources: [{ kind: 'movie-genre', genreId: 28 }, { kind: 'popular-movies' }] },
  { id: 'drama', title: 'Drama Done Right', sources: [{ kind: 'movie-genre', genreId: 18 }, { kind: 'tv-genre', genreId: 18 }] },
  { id: 'science-fiction', title: 'Sci-Fi & Beyond', sources: [{ kind: 'movie-genre', genreId: 878 }, { kind: 'tv-genre', genreId: 10765 }] },
  { id: 'family', title: 'Family Night', sources: [{ kind: 'movie-genre', genreId: 10751 }, { kind: 'tv-genre', genreId: 10762 }] },
  { id: 'thrills', title: 'Late-Night Thrills', sources: [{ kind: 'movie-genre', genreId: 27 }, { kind: 'tv-genre', genreId: 9648 }] },
];
