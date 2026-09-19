export interface WatchlistItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  rating?: number;
  year?: string;
  addedAt: string;
}
