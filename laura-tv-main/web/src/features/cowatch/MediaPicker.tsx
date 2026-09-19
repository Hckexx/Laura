import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMovieDetails, fetchTVDetails, fetchTVSeason, getPosterUrl, searchMovies, searchTVShows } from '../../services/media-api'
import { completeMediaSelection, type MediaTarget } from './media-selection'
import type { CowatchMedia } from './types'

type MediaPickerProps = {
  value: CowatchMedia | null
  initialTarget?: MediaTarget | null
  onChange: (media: CowatchMedia | null) => void
}

type SearchItem = {
  id: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath: string | null
  year?: string
}

export function MediaPicker({ value, initialTarget, onChange }: MediaPickerProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [target, setTarget] = useState<MediaTarget | null>(() => initialTarget ?? (value ? { type: value.type, id: value.id, season: value.season, episode: value.episode } : null))
  const [season, setSeason] = useState<number | undefined>(initialTarget?.season ?? value?.season)
  const [episode, setEpisode] = useState<number | undefined>(initialTarget?.episode ?? value?.episode)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!value) return
    setTarget({ type: value.type, id: value.id, season: value.season, episode: value.episode })
    setSeason(value.season)
    setEpisode(value.episode)
  }, [value])

  const { data: movies = [], isLoading: moviesLoading } = useQuery({
    queryKey: ['mediaPickerSearchMovies', debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  })

  const { data: shows = [], isLoading: showsLoading } = useQuery({
    queryKey: ['mediaPickerSearchShows', debouncedQuery],
    queryFn: () => searchTVShows(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  })

  const { data: movieDetails } = useQuery({
    queryKey: ['movieDetails', target?.type === 'movie' ? target.id : 0],
    queryFn: () => fetchMovieDetails(target!.id),
    enabled: target?.type === 'movie',
  })
  const { data: showDetails } = useQuery({
    queryKey: ['tvDetails', target?.type === 'tv' ? target.id : 0],
    queryFn: () => fetchTVDetails(target!.id),
    enabled: target?.type === 'tv',
  })
  const { data: seasonDetails, isLoading: seasonLoading } = useQuery({
    queryKey: ['tvSeason', target?.type === 'tv' ? target.id : 0, season],
    queryFn: () => fetchTVSeason(target!.id, season!),
    enabled: target?.type === 'tv' && season !== undefined && season !== null && season >= 0,
  })

  const results = useMemo<SearchItem[]>(() => [
    ...movies.map((item: any) => ({ id: item.id, mediaType: 'movie' as const, title: item.title, posterPath: item.poster_path, year: item.release_date?.slice(0, 4) })),
    ...shows.map((item: any) => ({ id: item.id, mediaType: 'tv' as const, title: item.name, posterPath: item.poster_path, year: item.first_air_date?.slice(0, 4) })),
  ], [movies, shows])

  const selectResult = (item: SearchItem) => {
    const nextTarget: MediaTarget = { type: item.mediaType, id: item.id }
    setTarget(nextTarget)
    setSeason(undefined)
    setEpisode(undefined)
    setQuery('')
    onChange(completeMediaSelection(nextTarget))
  }

  const selectSeason = (seasonNumber: number) => {
    setSeason(seasonNumber)
    setEpisode(undefined)
    onChange(null)
  }

  const selectEpisode = (episodeNumber: number) => {
    setEpisode(episodeNumber)
    if (target && season !== undefined && season !== null && season >= 0) {
      onChange(completeMediaSelection(target, season, episodeNumber))
    }
  }

  const title = target?.type === 'movie' ? movieDetails?.title : showDetails?.name
  const posterPath = target?.type === 'movie' ? movieDetails?.poster_path : showDetails?.poster_path
  const seasons = showDetails?.seasons?.filter((item: any) => item.season_number >= 0) ?? []
  const episodes = seasonDetails?.episodes ?? []

  const hasValidSeason = season !== undefined && season !== null && season >= 0

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative flex items-center">
          <svg className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            id="cowatch-media-search" 
            value={query} 
            onChange={(event) => setQuery(event.target.value)} 
            placeholder="Search movies and TV shows..." 
            className="w-full rounded-xl border border-white/[0.1] bg-[#0c0f13] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all" 
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 text-gray-500 hover:text-gray-300 text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {(moviesLoading || showsLoading) && (
          <div className="flex items-center gap-2 mt-2 px-1 text-xs text-amber-300/80 font-mono">
            <div className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Searching catalogs…</span>
          </div>
        )}

        {debouncedQuery.length > 1 && !moviesLoading && !showsLoading && (
          <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-white/[0.12] bg-[#10141a]/95 backdrop-blur-md p-2 shadow-2xl z-30 relative">
            {results.length === 0 && (
              <p className="p-3 text-xs text-gray-400 text-center font-mono">
                No matching movies or TV shows found.
              </p>
            )}
            {results.slice(0, 10).map((item) => (
              <button 
                type="button" 
                key={`${item.mediaType}-${item.id}`} 
                onClick={() => selectResult(item)} 
                className="flex w-full items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2 text-left hover:bg-amber-400/[0.08] hover:border-amber-400/30 transition-all group"
              >
                {item.posterPath ? (
                  <img src={getPosterUrl(item.posterPath) ?? undefined} alt="" className="h-12 w-8.5 rounded object-cover shadow-sm border border-white/[0.08] shrink-0" />
                ) : (
                  <div className="h-12 w-8.5 rounded bg-white/[0.06] border border-white/[0.08] shrink-0 flex items-center justify-center text-[9px] text-gray-500 font-mono">
                    N/A
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <strong className="block text-gray-100 text-xs sm:text-sm font-semibold truncate group-hover:text-amber-200 transition-colors">
                    {item.title}
                  </strong>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {item.mediaType === 'movie' ? 'Movie' : 'TV Series'}{item.year ? ` · ${item.year}` : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {target && (
        <div className="rounded-xl border border-amber-400/25 bg-gradient-to-r from-[#141820] to-[#0f1318] p-3.5 shadow-lg space-y-3">
          <div className="flex items-center gap-3.5">
            {posterPath ? (
              <img src={getPosterUrl(posterPath) ?? undefined} alt="" className="h-16 w-11 rounded-lg object-cover shadow-md border border-white/[0.12] shrink-0" />
            ) : (
              <div className="h-16 w-11 rounded-lg bg-white/[0.06] shrink-0" />
            )}
            <div className="min-w-0 flex-1 text-left">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-[10px] font-mono font-bold text-amber-300 uppercase mb-1">
                <span>Selected for Room</span>
              </div>
              <strong className="block text-gray-100 text-xs sm:text-sm font-bold truncate">
                {title ?? 'Loading selection…'}
              </strong>
              <span className="text-[11px] text-gray-400 font-mono">
                {target.type === 'movie' ? 'Feature Film' : 'Television Series'}
              </span>
            </div>
          </div>

          {target.type === 'tv' && (
            <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Season
                </label>
                <select 
                  value={season ?? ''} 
                  onChange={(event) => selectSeason(Number(event.target.value))} 
                  className="w-full rounded-lg border border-white/[0.12] bg-[#0c0f13] px-2.5 py-1.5 text-xs text-gray-100 outline-none focus:border-amber-400/50"
                >
                  <option value="">Choose season</option>
                  {seasons.map((item: any) => (
                    <option key={item.season_number} value={item.season_number}>
                      {item.name || (item.season_number === 0 ? 'Specials' : `Season ${item.season_number}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Episode
                </label>
                <select 
                  disabled={!hasValidSeason || seasonLoading} 
                  value={episode ?? ''} 
                  onChange={(event) => selectEpisode(Number(event.target.value))} 
                  className="w-full rounded-lg border border-white/[0.12] bg-[#0c0f13] px-2.5 py-1.5 text-xs text-gray-100 outline-none focus:border-amber-400/50 disabled:opacity-40"
                >
                  <option value="">{seasonLoading ? 'Loading…' : 'Choose episode'}</option>
                  {episodes.map((item: any) => (
                    <option key={item.episode_number} value={item.episode_number}>
                      E{item.episode_number}: {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MediaPicker
