export interface WatchlistItem {
  id: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath: string | null
  rating?: number
  year?: string
  addedAt: string
}

const WATCHLIST_KEY = 'laura_tv_watchlist'

// Get all watchlist items
export function getWatchlist(): WatchlistItem[] {
  try {
    const data = localStorage.getItem(WATCHLIST_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// Add item to watchlist
export function addToWatchlist(item: WatchlistItem): WatchlistItem[] {
  const current = getWatchlist()
  const exists = current.some((i) => i.id === item.id && i.mediaType === item.mediaType)
  
  if (!exists) {
    const updated = [...current, item]
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated))
    return updated
  }
  
  return current
}

// Remove item from watchlist
export function removeFromWatchlist(id: number, mediaType: 'movie' | 'tv'): WatchlistItem[] {
  const current = getWatchlist()
  const updated = current.filter((i) => !(i.id === id && i.mediaType === mediaType))
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated))
  return updated
}

// Check if item is in watchlist
export function isInWatchlist(id: number, mediaType: 'movie' | 'tv'): boolean {
  const current = getWatchlist()
  return current.some((i) => i.id === id && i.mediaType === mediaType)
}

// Toggle item in watchlist
export function toggleWatchlist(item: WatchlistItem): { added: boolean; list: WatchlistItem[] } {
  const isAdded = isInWatchlist(item.id, item.mediaType)
  
  if (isAdded) {
    const list = removeFromWatchlist(item.id, item.mediaType)
    return { added: false, list }
  } else {
    const list = addToWatchlist(item)
    return { added: true, list }
  }
}
