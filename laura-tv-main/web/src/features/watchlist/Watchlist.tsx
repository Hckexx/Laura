import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWatchlist, type WatchlistItem } from './storage'
import MediaGrid from '../../components/media/MediaGrid'

function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all')

  useEffect(() => {
    setItems(getWatchlist())
  }, [])

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter((item) => item.mediaType === filter)

  const movies = filteredItems.filter((item) => item.mediaType === 'movie')
  const tvShows = filteredItems.filter((item) => item.mediaType === 'tv')

  return (
    <div className="min-h-screen pb-20">
      {/* Page Header */}
      <div className="pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-50 mb-2 tracking-tight">My List</h1>
        <p className="text-sm text-gray-400">Personal saved titles for later viewing</p>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex gap-2 bg-[#13171c] border border-white/[0.06] rounded-xl p-1 inline-flex">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-amber-400 text-[#17120a] shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter('movie')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'movie'
                ? 'bg-amber-400 text-[#17120a] shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Movies ({items.filter((i) => i.mediaType === 'movie').length})
          </button>
          <button
            onClick={() => setFilter('tv')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'tv'
                ? 'bg-amber-400 text-[#17120a] shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            TV Shows ({items.filter((i) => i.mediaType === 'tv').length})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 px-4 text-center">
          <h2 className="text-lg font-bold text-gray-200 mb-2">Your watchlist is empty</h2>
          <p className="text-xs text-gray-400 mb-6 max-w-sm">
            Save movies and TV shows to easily find and watch them with friends.
          </p>
          <Link
            to="/watch"
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#17120a] font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-400/10"
          >
            Browse Watch
          </Link>
        </div>
      )}

      {/* Filtered Empty State */}
      {items.length > 0 && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 px-4 text-center">
          <p className="text-xs text-gray-400">No {filter === 'movie' ? 'movies' : 'TV shows'} in your watchlist</p>
        </div>
      )}

      {/* Watchlist Grid */}
      {filteredItems.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pb-12">
          {/* Movies section */}
          {movies.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-100 mb-4 tracking-tight">Movies</h2>
              <MediaGrid
                items={movies.map((item) => ({
                  id: item.id,
                  title: item.title,
                  poster_path: item.posterPath,
                  vote_average: item.rating,
                  release_date: item.year,
                }))}
                mediaType="movie"
              />
            </section>
          )}

          {/* TV section */}
          {tvShows.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-100 mb-4 tracking-tight">TV Shows</h2>
              <MediaGrid
                items={tvShows.map((item) => ({
                  id: item.id,
                  name: item.title,
                  poster_path: item.posterPath,
                  vote_average: item.rating,
                  first_air_date: item.year,
                }))}
                mediaType="tv"
              />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default Watchlist
