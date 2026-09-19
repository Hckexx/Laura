import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WatchlistItem } from '../../types/watchlist';

const WATCHLIST_KEY = '@laura_tv_watchlist';

// Get all watchlist items
export async function getWatchlist(): Promise<WatchlistItem[]> {
  try {
    const data = await AsyncStorage.getItem(WATCHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Failed to read watchlist from storage:', error);
    return [];
  }
}

// Add item to watchlist
export async function addToWatchlist(item: WatchlistItem): Promise<WatchlistItem[]> {
  try {
    const current = await getWatchlist();
    const exists = current.some((i) => i.id === item.id && i.mediaType === item.mediaType);

    if (!exists) {
      const updated = [item, ...current];
      await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch (error) {
    console.warn('Failed to add item to watchlist:', error);
    return [];
  }
}

// Remove item from watchlist
export async function removeFromWatchlist(id: number, mediaType: 'movie' | 'tv'): Promise<WatchlistItem[]> {
  try {
    const current = await getWatchlist();
    const updated = current.filter((i) => !(i.id === id && i.mediaType === mediaType));
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('Failed to remove item from watchlist:', error);
    return [];
  }
}

// Check if item is in watchlist
export async function isInWatchlist(id: number, mediaType: 'movie' | 'tv'): Promise<boolean> {
  const current = await getWatchlist();
  return current.some((i) => i.id === id && i.mediaType === mediaType);
}

// Toggle item in watchlist
export async function toggleWatchlist(item: WatchlistItem): Promise<{ added: boolean; list: WatchlistItem[] }> {
  const isAdded = await isInWatchlist(item.id, item.mediaType);

  if (isAdded) {
    const list = await removeFromWatchlist(item.id, item.mediaType);
    return { added: false, list };
  } else {
    const list = await addToWatchlist(item);
    return { added: true, list };
  }
}
