export type WatchCategorySource =
  | { kind: 'trending-movies' | 'trending-tv' | 'popular-movies' | 'popular-tv' }
  | { kind: 'top-rated-movies' | 'top-rated-tv' | 'now-playing-movies' | 'airing-today-tv' }
  | { kind: 'movie-genre' | 'tv-genre'; genreId: number }
  | { kind: 'filtered-movies'; filters: Record<string, string> }

export type WatchCategory = {
  id: string
  title: string
  sources: WatchCategorySource[]
}

export const WATCH_CATEGORIES: WatchCategory[] = [
  { id: 'trending', title: 'Trending Now', sources: [{ kind: 'trending-movies' }, { kind: 'trending-tv' }] },
  { id: 'fresh', title: 'Fresh Releases', sources: [{ kind: 'now-playing-movies' }, { kind: 'airing-today-tv' }] },
  { id: 'bollywood', title: 'Bollywood Spotlight', sources: [{ kind: 'filtered-movies', filters: { with_original_language: 'hi', sort_by: 'popularity.desc' } }] },
  { id: 'crowd-pleasers', title: 'Crowd Pleasers', sources: [{ kind: 'top-rated-movies' }, { kind: 'top-rated-tv' }] },
  { id: 'comedy', title: 'Need a Good Laugh?', sources: [{ kind: 'movie-genre', genreId: 35 }, { kind: 'tv-genre', genreId: 35 }] },
  { id: 'bollywood-comedy', title: 'Desi Laughs', sources: [{ kind: 'filtered-movies', filters: { with_original_language: 'hi', with_genres: '35', sort_by: 'popularity.desc' } }] },
  { id: 'episodes', title: 'One More Episode', sources: [{ kind: 'popular-tv' }, { kind: 'airing-today-tv' }] },
  { id: 'big-screen', title: 'Big Screen Energy', sources: [{ kind: 'movie-genre', genreId: 28 }, { kind: 'popular-movies' }] },
  { id: 'drama', title: 'Drama Done Right', sources: [{ kind: 'movie-genre', genreId: 18 }, { kind: 'tv-genre', genreId: 18 }] },
  { id: 'bollywood-romance', title: 'Bollywood Romance', sources: [{ kind: 'filtered-movies', filters: { with_original_language: 'hi', with_genres: '10749', sort_by: 'popularity.desc' } }] },
  { id: 'science-fiction', title: 'Sci-Fi & Beyond', sources: [{ kind: 'movie-genre', genreId: 878 }, { kind: 'tv-genre', genreId: 10765 }] },
  { id: 'family', title: 'Family Night', sources: [{ kind: 'movie-genre', genreId: 10751 }, { kind: 'tv-genre', genreId: 10762 }] },
  { id: 'thrills', title: 'Late-Night Thrills', sources: [{ kind: 'movie-genre', genreId: 27 }, { kind: 'tv-genre', genreId: 9648 }] },
]
