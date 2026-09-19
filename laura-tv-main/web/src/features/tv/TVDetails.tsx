import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  fetchTVDetails,
  fetchTVCredits,
  fetchSimilarTVShows,
  fetchTVVideos,
  getBackdropUrl,
  getPosterUrl,
} from '../../services/media-api'
import MediaGrid from '../../components/media/MediaGrid'
import WatchlistButton from '../../components/media/WatchlistButton'

function TVDetails() {
  const { id } = useParams<{ id: string }>()
  const tvId = Number(id)

  const { data: show, isLoading: showLoading } = useQuery({
    queryKey: ['tvDetails', tvId],
    queryFn: () => fetchTVDetails(tvId),
    enabled: !!tvId,
  })

  const { data: credits } = useQuery({
    queryKey: ['tvCredits', tvId],
    queryFn: () => fetchTVCredits(tvId),
    enabled: !!tvId,
  })

  const { data: similar } = useQuery({
    queryKey: ['similarTV', tvId],
    queryFn: () => fetchSimilarTVShows(tvId),
    enabled: !!tvId,
  })

  const { data: videos } = useQuery({
    queryKey: ['tvVideos', tvId],
    queryFn: () => fetchTVVideos(tvId),
    enabled: !!tvId,
  })

  if (showLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!show) {
    return (
      <div className="flex flex-col items-center justify-center py-40 px-4">
        <h2 className="text-xl font-bold text-gray-100 mb-2">Series not found</h2>
        <Link to="/watch" className="text-amber-400 hover:text-amber-300 transition-colors text-sm">
          Return to Watch
        </Link>
      </div>
    )
  }

  const backdropUrl = getBackdropUrl(show.backdrop_path)
  const posterUrl = getPosterUrl(show.poster_path)
  const cast = credits?.cast?.slice(0, 12) || []
  const similarShows = Array.isArray(similar) ? similar : similar?.results || []
  const trailer = videos?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || videos?.[0]
  // Include all valid seasons with episodes
  const seasons = show.seasons?.filter((s: any) => s.episode_count > 0) || []

  return (
    <div className="min-h-screen pb-20">
      {/* Backdrop Hero */}
      <div className="relative h-[72vh] min-h-[500px] w-full overflow-hidden">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={show.name}
            className="absolute inset-0 w-full h-full object-cover object-top scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f12] via-[#0d0f12]/85 to-[#0d0f12]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f12] via-[#0d0f12]/60 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-14">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-end md:items-center">
            {/* Poster */}
            {posterUrl && (
              <div className="hidden md:block flex-shrink-0">
                <img
                  src={posterUrl}
                  alt={show.name}
                  className="w-52 lg:w-60 rounded-2xl shadow-2xl shadow-black/80 border border-white/[0.1] object-cover"
                />
              </div>
            )}

            {/* Details */}
            <div className="flex-1 space-y-4">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-50 tracking-tight leading-tight drop-shadow-md">
                {show.name}
              </h1>

              {show.tagline && (
                <p className="text-gray-400 italic text-sm">{show.tagline}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                {show.vote_average > 0 && (
                  <span className="font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/25 px-2.5 py-0.5 rounded-full">
                    ★ {show.vote_average.toFixed(1)}
                  </span>
                )}
                {show.first_air_date && (
                  <span className="text-gray-300 font-medium">{show.first_air_date.slice(0, 4)}</span>
                )}
                <span className="text-gray-400">{show.number_of_seasons} Seasons</span>
                <span className="text-gray-400">{show.number_of_episodes} Episodes</span>
                {show.genres?.map((genre: any) => (
                  <span
                    key={genre.id}
                    className="px-2.5 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded-md text-xs text-gray-300"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              {show.overview && (
                <p className="text-gray-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                  {show.overview}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={`/watch/${show.id}?type=tv`}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-gray-950 font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-amber-400/15 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Series
                </Link>

                <Link
                  to={`/cowatch?type=tv&id=${show.id}`}
                  className="px-5 py-3 bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] border border-white/[0.12] text-gray-100 font-medium text-sm sm:text-base rounded-xl transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Watch Together
                </Link>

                <WatchlistButton
                  id={show.id}
                  mediaType="tv"
                  title={show.name}
                  posterPath={show.poster_path}
                  rating={show.vote_average}
                  year={show.first_air_date?.slice(0, 4)}
                />

                {trailer?.key && (
                  <a
                    href={`https://www.youtube.com/watch?v=${trailer.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 text-gray-300 hover:text-white text-sm font-medium rounded-xl hover:bg-white/[0.06] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Trailer
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seasons Section */}
      {seasons.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-xl font-bold text-gray-100 mb-6 tracking-tight">Available Seasons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {seasons.map((season: any) => (
              <Link
                key={season.id}
                to={`/tv/${show.id}/season/${season.season_number}`}
                className="group bg-[#13171c] rounded-2xl overflow-hidden border border-white/[0.06] hover:border-amber-400/30 transition-all hover:bg-[#1a1f26] hover:shadow-xl hover:shadow-black/50"
              >
                <div className="aspect-[16/9] overflow-hidden bg-[#1a1f26]">
                  {season.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${season.poster_path}`}
                      alt={season.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <span className="text-3xl">📺</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-100 group-hover:text-amber-200 transition-colors text-sm sm:text-base">
                    {season.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {season.episode_count} {season.episode_count === 1 ? 'episode' : 'episodes'}
                    {season.air_date && ` • ${season.air_date.slice(0, 4)}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cast Section */}
      {cast.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-xl font-bold text-gray-100 mb-6 tracking-tight">Featured Cast</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
            {cast.map((person: any) => (
              <div key={person.id} className="flex-shrink-0 w-28 text-center group">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#13171c] border border-white/[0.06] mb-2 group-hover:border-amber-400/30 transition-all">
                  {person.profile_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${person.profile_path}`}
                      alt={person.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <span className="text-2xl">👤</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-200 truncate">{person.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{person.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar Shows */}
      {similarShows.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-xl font-bold text-gray-100 mb-6 tracking-tight">Similar Series</h2>
          <MediaGrid items={similarShows} mediaType="tv" />
        </div>
      )}
    </div>
  )
}

export default TVDetails
