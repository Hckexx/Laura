import MediaCard from './MediaCard'

interface MediaItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  media_type?: 'movie' | 'tv'
  vote_average?: number
  release_date?: string
  first_air_date?: string
  genre_ids?: number[]
}

interface MediaGridProps {
  items: MediaItem[]
  mediaType: 'movie' | 'tv'
}

function MediaGrid({ items, mediaType }: MediaGridProps) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-white/[0.05] bg-[#111419]/50">
        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-gray-500 mb-3.5">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-200">No content found</p>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">Try selecting a different category or genre filter.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5 lg:gap-6">
      {items.map((item) => {
        const itemTitle = item.title || item.name || 'Untitled'
        const year = item.release_date
          ? item.release_date.slice(0, 4)
          : item.first_air_date
          ? item.first_air_date.slice(0, 4)
          : undefined

        return (
          <MediaCard
            key={item.id}
            id={item.id}
            title={itemTitle}
            posterPath={item.poster_path}
            mediaType={mediaType}
            rating={item.vote_average}
            year={year}
          />
        )
      })}
    </div>
  )
}

export default MediaGrid