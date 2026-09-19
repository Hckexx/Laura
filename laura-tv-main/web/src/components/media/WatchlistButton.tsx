import { useState, useEffect } from 'react'
import { isInWatchlist, toggleWatchlist } from '../../features/watchlist/storage'

interface WatchlistButtonProps {
  id: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath: string | null
  rating?: number
  year?: string
  className?: string
}

function WatchlistButton({ id, mediaType, title, posterPath, rating, year, className = '' }: WatchlistButtonProps) {
  const [isAdded, setIsAdded] = useState(false)

  useEffect(() => {
    setIsAdded(isInWatchlist(id, mediaType))
  }, [id, mediaType])

  const handleToggle = () => {
    const result = toggleWatchlist({
      id,
      mediaType,
      title,
      posterPath,
      rating,
      year,
      addedAt: new Date().toISOString(),
    })
    setIsAdded(result.added)
  }

  return (
    <button
      onClick={handleToggle}
      className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
        isAdded
          ? 'bg-red-600 text-white'
          : 'bg-white/10 hover:bg-white/20 text-white'
      } ${className}`}
    >
      {isAdded ? (
        <>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          Added
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add to Watchlist
        </>
      )}
    </button>
  )
}

export default WatchlistButton