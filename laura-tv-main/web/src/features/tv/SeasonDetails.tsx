import { useParams, Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchTVSeason,
  fetchTVDetails,
  getPosterUrl,
} from '../../services/media-api'

function SeasonDetails() {
  const { id, seasonNumber } = useParams<{ id: string; seasonNumber: string }>()
  const tvId = Number(id)
  const seasonNum = Number(seasonNumber)
  const [episodeSearch, setEpisodeSearch] = useState('')

  const { data: show } = useQuery({
    queryKey: ['tvDetails', tvId],
    queryFn: () => fetchTVDetails(tvId),
    enabled: !!tvId,
  })

  const { data: season, isLoading: seasonLoading } = useQuery({
    queryKey: ['tvSeason', tvId, seasonNum],
    queryFn: () => fetchTVSeason(tvId, seasonNum),
    enabled: !!tvId && Number.isInteger(seasonNum),
  })

  const episodes = useMemo(() => season?.episodes || [], [season?.episodes])

  const filteredEpisodes = useMemo(() => {
    const query = episodeSearch.trim().toLowerCase()
    if (!query) return episodes

    return episodes.filter((episode: any) => {
      const title = (episode.name || '').toLowerCase()
      const overview = (episode.overview || '').toLowerCase()
      const episodeNum = String(episode.episode_number)
      return title.includes(query) || overview.includes(query) || episodeNum === query
    })
  }, [episodes, episodeSearch])

  if (seasonLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!season) {
    return (
      <div className="flex flex-col items-center justify-center py-40 px-4">
        <h2 className="text-xl font-bold text-gray-100 mb-2">Season not found</h2>
        <Link to={`/tv/${tvId}`} className="text-amber-400 hover:text-amber-300 transition-colors text-sm">
          Return to Series
        </Link>
      </div>
    )
  }

  const seasonPoster = getPosterUrl(season.poster_path || show?.poster_path)

  return (
    <div className="min-h-screen pb-20">
      {/* Season Header */}
      <div className="relative overflow-hidden border-b border-white/[0.06] bg-[#0d0f12]">
        {seasonPoster && (
          <div className="absolute inset-0">
            <img
              src={seasonPoster}
              alt={season.name}
              className="w-full h-full object-cover opacity-15 blur-md"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d0f12]/80 to-[#0d0f12]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <Link
            to={`/tv/${tvId}`}
            className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 transition-colors mb-4 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {show?.name || 'Series'}
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-50 mb-2 tracking-tight">
            {season.name}
          </h1>
          <p className="text-sm text-gray-400">
            {episodes.length} episodes
            {season.air_date && ` • ${season.air_date.slice(0, 4)}`}
          </p>
          {season.overview && (
            <p className="text-gray-300 text-sm sm:text-base mt-3 max-w-3xl leading-relaxed">
              {season.overview}
            </p>
          )}

          {/* Episode Search Bar */}
          <div className="relative w-full max-w-md mt-6">
            <input
              type="text"
              placeholder="Search or filter episodes..."
              value={episodeSearch}
              onChange={(e) => setEpisodeSearch(e.target.value)}
              className="w-full bg-[#13171c] hover:bg-[#1a1f26] focus:bg-[#1a1f26] border border-white/[0.08] focus:border-amber-400/40 text-sm text-gray-100 placeholder-gray-400 rounded-xl pl-9 pr-8 py-2 outline-none focus:ring-1 focus:ring-amber-400/40 transition-all"
            />
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {episodeSearch && (
              <button
                onClick={() => setEpisodeSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Episode List */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {filteredEpisodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-400 text-sm">No episodes match "{episodeSearch}"</p>
          </div>
        )}

        <div className="space-y-4">
          {filteredEpisodes.map((episode: any) => (
            <div
              key={episode.id}
              className="group flex flex-col md:flex-row gap-5 bg-[#13171c] rounded-2xl overflow-hidden border border-white/[0.06] hover:border-amber-400/30 hover:bg-[#1a1f26] transition-all p-4 items-start md:items-center shadow-md"
            >
              {/* Episode Still */}
              <div className="w-full md:w-56 shrink-0 aspect-video rounded-xl overflow-hidden bg-[#1a1f26] relative">
                {episode.still_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w400${episode.still_path}`}
                    alt={episode.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <span className="text-2xl">🎬</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-bold text-gray-200">
                  E{episode.episode_number}
                </div>
              </div>

              {/* Episode Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-100 group-hover:text-amber-200 transition-colors text-base truncate">
                    {episode.name}
                  </h3>
                  {episode.vote_average > 0 && (
                    <span className="shrink-0 text-amber-300 text-xs font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      ★ {episode.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  {episode.runtime > 0 ? `${episode.runtime} min` : 'Standard length'}
                  {episode.air_date && ` • ${episode.air_date}`}
                </p>

                {episode.overview && (
                  <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed pt-1">
                    {episode.overview}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex md:flex-col items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
                <Link
                  to={`/watch/${tvId}?type=tv&season=${episode.season_number}&episode=${episode.episode_number}`}
                  className="flex-1 md:flex-initial w-full px-4 py-2 bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs sm:text-sm font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch
                </Link>
                <Link
                  to={`/cowatch?type=tv&id=${tvId}&season=${episode.season_number}&episode=${episode.episode_number}`}
                  className="flex-1 md:flex-initial w-full px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-gray-200 text-xs sm:text-sm font-medium rounded-xl transition-all text-center active:scale-[0.98]"
                >
                  Together
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SeasonDetails
