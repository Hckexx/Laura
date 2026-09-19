import { useRef, useState } from 'react'
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
}

interface ContentRowProps {
  title: string
  items: MediaItem[]
  mediaType?: 'movie' | 'tv'
  actionLabel?: string
  onAction?: () => void
  emptyMessage?: string
}

function ContentRow({ title, items, mediaType, actionLabel, onAction, emptyMessage }: ContentRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  if ((!items || items.length === 0) && !emptyMessage) return null

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    )
  }

  const scrollByAmount = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.75
    const targetScroll = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    })
  }

  return (
    <section className="relative group/row mb-12">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 mb-4">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-100">{title}</h2>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-400/10 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
          >
            {actionLabel}
          </button>
        )}
      </div>

      <div className="relative">
        {items.length === 0 && emptyMessage && (
          <div className="mx-4 rounded-xl bg-[#13171c] px-4 py-5 text-sm text-gray-400 sm:mx-6 lg:mx-8">
            {emptyMessage}
          </div>
        )}
        {/* Left Scroll Trigger */}
        {items.length > 0 && canScrollLeft && (
          <button
            onClick={() => scrollByAmount('left')}
            className="absolute left-0 top-0 bottom-0 z-20 w-12 sm:w-16 bg-gradient-to-r from-[#0d0f12]/90 to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
            aria-label="Scroll left"
          >
            <div className="w-9 h-9 rounded-full bg-[#13171c]/90 border border-white/10 backdrop-blur-md flex items-center justify-center hover:bg-[#1a1f26] text-gray-200 hover:text-white transition-colors shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </button>
        )}

        {/* Scrollable container */}
        {items.length > 0 && <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-4 scrollbar-none snap-x"
        >
          {items.map((item) => {
            const itemMediaType = mediaType || item.media_type || 'movie'
            const itemTitle = item.title || item.name || 'Untitled'
            const year = item.release_date
              ? item.release_date.slice(0, 4)
              : item.first_air_date
              ? item.first_air_date.slice(0, 4)
              : undefined

            return (
              <div
                key={item.id}
                className="flex-shrink-0 w-36 sm:w-44 md:w-48 snap-start"
              >
                <MediaCard
                  id={item.id}
                  title={itemTitle}
                  posterPath={item.poster_path}
                  mediaType={itemMediaType}
                  rating={item.vote_average}
                  year={year}
                />
              </div>
            )
          })}
        </div>}

        {/* Right Scroll Trigger */}
        {items.length > 0 && canScrollRight && (
          <button
            onClick={() => scrollByAmount('right')}
            className="absolute right-0 top-0 bottom-0 z-20 w-12 sm:w-16 bg-gradient-to-l from-[#0d0f12]/90 to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
            aria-label="Scroll right"
          >
            <div className="w-9 h-9 rounded-full bg-[#13171c]/90 border border-white/10 backdrop-blur-md flex items-center justify-center hover:bg-[#1a1f26] text-gray-200 hover:text-white transition-colors shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}
      </div>
    </section>
  )
}

export default ContentRow
