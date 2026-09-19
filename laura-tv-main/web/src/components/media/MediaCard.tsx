import { Link } from 'react-router-dom'
import { getPosterUrl } from '../../services/media-api'

interface MediaCardProps {
  id: number
  title: string
  posterPath: string | null
  mediaType: 'movie' | 'tv'
  rating?: number
  year?: string
}

function MediaCard({ id, title, posterPath, mediaType, rating, year }: MediaCardProps) {
  const linkPath = mediaType === 'movie' ? `/movie/${id}` : `/tv/${id}`
  const posterUrl = getPosterUrl(posterPath)

  return (
    <Link
      to={linkPath}
      className="group relative block rounded-xl overflow-hidden bg-[#111419] border border-white/[0.07] hover:border-amber-400/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 select-none"
    >
      {/* Poster Media */}
      <div className="aspect-[2/3] w-full overflow-hidden bg-[#161a22] relative">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 group-hover:opacity-95"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#181e28] to-[#101318]">
            <span className="text-xl font-bold tracking-widest text-gray-600 font-mono">LAURA<span className="text-red-500">TV</span></span>
            <span className="text-[10px] text-gray-500 font-mono mt-1">No Poster Available</span>
          </div>
        )}

        {/* Rating Badge */}
        {rating !== undefined && rating > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-[#0a0c10]/80 backdrop-blur-md border border-white/[0.12] px-2 py-0.5 rounded-md text-[11px] font-mono font-bold text-amber-300 shadow-md flex items-center gap-1">
            <span className="text-amber-400 text-[10px]">★</span>
            <span>{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Media Type Indicator */}
        <div className="absolute top-2.5 left-2.5 bg-[#0a0c10]/75 backdrop-blur-md border border-white/[0.1] px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-gray-300">
          {mediaType === 'movie' ? 'Film' : 'Series'}
        </div>
      </div>

      {/* Bottom Gradient & Text Details */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/85 to-transparent">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-100 truncate group-hover:text-amber-200 transition-colors leading-tight">
          {title}
        </h3>
        <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px] font-mono text-gray-400">
          <span>{year || '—'}</span>
          <span className="text-amber-400/80 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
            Watch →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default MediaCard