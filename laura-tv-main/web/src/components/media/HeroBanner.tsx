import { Link } from 'react-router-dom'
import { getBackdropUrl } from '../../services/media-api'

interface HeroBannerProps {
  id: number
  title: string
  description: string
  backdropPath: string | null
  mediaType: 'movie' | 'tv'
  rating?: number
  year?: string
}

function HeroBanner({ id, title, description, backdropPath, mediaType, rating, year }: HeroBannerProps) {
  const backdropUrl = getBackdropUrl(backdropPath)
  const detailsPath = mediaType === 'movie' ? `/movie/${id}` : `/tv/${id}`
  const cowatchPath = `/cowatch?type=${mediaType}&id=${id}`

  return (
    <div className="relative h-[82vh] min-h-[520px] max-h-[720px] w-full overflow-hidden">
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover object-top scale-105 transition-transform duration-1000 ease-out"
        />
      )}

      {/* Cinematic Vignette Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f12] via-[#0d0f12]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f12] via-[#0d0f12]/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d0f12]/70 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-16 max-w-4xl">
        {/* Rating and Year Metadata */}
        <div className="flex items-center gap-3 mb-3 flex-wrap text-xs sm:text-sm">
          {rating && (
            <span className="flex items-center gap-1 font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/25 px-2.5 py-0.5 rounded-full">
              ★ {rating.toFixed(1)}
            </span>
          )}
          {year && <span className="text-gray-300 font-medium">{year}</span>}
          <span className="text-gray-400 uppercase tracking-widest text-[11px] font-semibold bg-white/[0.06] px-2 py-0.5 rounded">
            {mediaType === 'movie' ? 'Movie' : 'TV Series'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-50 mb-3 tracking-tight leading-tight drop-shadow-md">
          {title}
        </h1>

        <p className="text-gray-300 text-sm sm:text-base mb-6 line-clamp-3 max-w-2xl leading-relaxed">
          {description}
        </p>

        {/* Action CTAs */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to={`/watch/${id}?type=${mediaType}`}
            className="px-5 sm:px-6 py-2.5 sm:py-3 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-gray-950 font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-amber-500/15 flex items-center gap-2"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Now
          </Link>

          <Link
            to={cowatchPath}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] border border-white/[0.12] text-gray-100 font-medium text-sm sm:text-base rounded-xl transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Watch Together
          </Link>

          <Link
            to={detailsPath}
            className="px-4 py-2.5 sm:py-3 text-gray-400 hover:text-gray-100 font-medium text-sm rounded-xl transition-colors"
          >
            More Details
          </Link>
        </div>
      </div>
    </div>
  )
}

export default HeroBanner