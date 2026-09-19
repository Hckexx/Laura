import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchMovieDetails,
  fetchTVDetails,
  fetchTVSeason,
} from '../../services/media-api'
import { providers } from './providers'
import { buildResumableProviderUrl, parsePlaybackMessage } from '../progress/provider-progress'
import {
  getContinueWatching,
  isCompletedProgress,
  removeContinueWatching,
  upsertContinueWatching,
  type ContinueWatchingRecord,
} from '../progress/storage'

function Watch() {
  const { mediaId } = useParams<{ mediaId: string }>()
  const [searchParams] = useSearchParams()
  const mediaType = searchParams.get('type') || 'movie'
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')
  const id = Number(mediaId)
  const seasonNum = season !== null && season !== undefined && season !== '' ? Number(season) : undefined
  const episodeNum = episode !== null && episode !== undefined && episode !== '' ? Number(episode) : undefined
  const savedRecord = getContinueWatching().find((record) =>
    record.mediaId === id && record.mediaType === mediaType &&
    record.season === seasonNum && record.episode === episodeNum
  )
  const [activeProvider, setActiveProvider] = useState(savedRecord?.providerId || providers[0].id)
  const [resumePosition, setResumePosition] = useState(savedRecord?.positionSeconds)
  const [iframeError, setIframeError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const progressRef = useRef({
    positionSeconds: savedRecord?.positionSeconds,
    durationSeconds: savedRecord?.durationSeconds,
  })
  const lastPersistedAtRef = useRef(0)
  const lastPersistedPositionRef = useRef(savedRecord?.positionSeconds)
  const persistLatestRef = useRef<() => void>(() => undefined)

  const { data: movie, isLoading: movieLoading } = useQuery({
    queryKey: ['movieDetails', id],
    queryFn: () => fetchMovieDetails(id),
    enabled: mediaType === 'movie' && !!id,
  })

  const { data: show, isLoading: showLoading } = useQuery({
    queryKey: ['tvDetails', id],
    queryFn: () => fetchTVDetails(id),
    enabled: mediaType === 'tv' && !!id,
  })

  const { data: seasonData } = useQuery({
    queryKey: ['tvSeason', id, seasonNum],
    queryFn: () => fetchTVSeason(id, seasonNum!),
    enabled: mediaType === 'tv' && !!id && seasonNum !== undefined && Number.isInteger(seasonNum) && seasonNum >= 0,
  })

  const isLoading = movieLoading || showLoading

  const currentEpisode = seasonData?.episodes?.find(
    (ep: any) => ep.episode_number === episodeNum
  )

  const title = mediaType === 'movie' ? movie?.title : show?.name
  const subtitle = mediaType === 'tv' && episodeNum
    ? `S${seasonNum} E${episodeNum}${currentEpisode?.name ? ` - ${currentEpisode.name}` : ''}`
    : mediaType === 'tv'
      ? 'TV Show'
      : null

  const currentProvider = providers.find((p) => p.id === activeProvider) || providers[0]
  const iframeUrl = buildResumableProviderUrl(
    currentProvider.getUrl(id, mediaType, seasonNum, episodeNum),
    activeProvider,
    resumePosition,
  )

  const buildProgressRecord = useCallback((): ContinueWatchingRecord | null => {
    const media = mediaType === 'movie' ? movie : show
    if (!media || !Number.isInteger(id) || id <= 0) return null
    return {
      mediaId: id,
      mediaType: mediaType as 'movie' | 'tv',
      title: mediaType === 'movie' ? movie?.title || 'Movie' : show?.name || 'TV Show',
      posterPath: media.poster_path || null,
      providerId: activeProvider,
      updatedAt: Date.now(),
      ...(seasonNum !== undefined ? { season: seasonNum } : {}),
      ...(episodeNum !== undefined ? { episode: episodeNum } : {}),
      ...(currentEpisode?.name ? { episodeName: currentEpisode.name } : {}),
      ...(progressRef.current.positionSeconds !== undefined ? { positionSeconds: progressRef.current.positionSeconds } : {}),
      ...(progressRef.current.durationSeconds !== undefined ? { durationSeconds: progressRef.current.durationSeconds } : {}),
    }
  }, [activeProvider, currentEpisode, episodeNum, id, mediaType, movie, seasonNum, show])

  const persistLatest = useCallback(() => {
    const record = buildProgressRecord()
    if (!record) return
    if (isCompletedProgress(record.positionSeconds, record.durationSeconds)) {
      removeContinueWatching(id, record.mediaType)
      return
    }
    upsertContinueWatching(record)
    lastPersistedAtRef.current = Date.now()
    lastPersistedPositionRef.current = record.positionSeconds
  }, [buildProgressRecord, id])

  useEffect(() => {
    persistLatestRef.current = persistLatest
  }, [persistLatest])

  useEffect(() => {
    if (movie || show) persistLatest()
  }, [movie, persistLatest, show])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      const update = parsePlaybackMessage(activeProvider, event)
      if (!update) return
      if (update.positionSeconds !== undefined) progressRef.current.positionSeconds = update.positionSeconds
      if (update.durationSeconds !== undefined) progressRef.current.durationSeconds = update.durationSeconds
      if (update.kind === 'ended' || isCompletedProgress(progressRef.current.positionSeconds, progressRef.current.durationSeconds)) {
        removeContinueWatching(id, mediaType as 'movie' | 'tv')
        return
      }
      const position = progressRef.current.positionSeconds
      const advanced = position !== undefined && (lastPersistedPositionRef.current === undefined || Math.abs(position - lastPersistedPositionRef.current) >= 5)
      if (update.kind === 'pause' || (update.kind === 'progress' && Date.now() - lastPersistedAtRef.current >= 10_000 && advanced)) persistLatestRef.current()
    }
    const handleVisibility = () => { if (document.visibilityState === 'hidden') persistLatestRef.current() }
    window.addEventListener('message', handleMessage)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      persistLatestRef.current()
      window.removeEventListener('message', handleMessage)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [activeProvider, id, mediaType])

  // ============ NAVIGATION SHIELD ============

  useEffect(() => {
    // Block window.open from iframe scripts
    const originalOpen = window.open
    window.open = (url?: string | URL, target?: string, features?: string) => {
      if (!url || url === 'about:blank' || url === '') {
        return originalOpen(url, target, features)
      }
      // Block all external URLs
      return null
    }

    // Block the parent page from being redirected
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (iframeRef.current) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    // Block hash changes that try to navigate away
    const handleHashChange = (e: HashChangeEvent) => {
      if (iframeRef.current) {
        e.preventDefault()
      }
    }

    // Block popstate
    const handlePopState = (e: PopStateEvent) => {
      if (iframeRef.current) {
        e.preventDefault()
      }
    }

    // Block all click events that try to open new windows
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (anchor && anchor.target === '_blank') {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Block form submissions that try to navigate
    const handleSubmit = (e: Event) => {
      if (iframeRef.current) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleClick, true)
    document.addEventListener('submit', handleSubmit, true)

    return () => {
      window.open = originalOpen
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('submit', handleSubmit, true)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0d0f12] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0d0f12]/90 border-b border-white/[0.08] z-10">
        <Link
          to={mediaType === 'movie' ? `/movie/${id}` : episodeNum ? `/tv/${id}/season/${seasonNum}` : `/tv/${id}`}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-300 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="text-gray-100 text-sm sm:text-base font-semibold truncate mx-4 flex-1 text-center">
          {title}
          {subtitle && <span className="text-gray-400 font-normal"> • {subtitle}</span>}
        </h1>

        <Link
          to={mediaType === 'movie' ? `/cowatch?type=movie&id=${id}` : `/cowatch?type=tv&id=${id}&season=${seasonNum}&episode=${episodeNum}`}
          className="text-xs text-amber-300 hover:text-amber-200 font-medium px-2.5 py-1 rounded bg-amber-400/10 border border-amber-400/20"
        >
          Watch Together
        </Link>
      </div>

      {/* Player Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {isLoading && (
          <div className="flex flex-col items-center py-20">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-xs mt-3">Loading stream...</p>
          </div>
        )}

        {!isLoading && (
          <div className="w-full max-w-6xl">
            {/* Provider Switcher */}
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none pb-1">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    persistLatestRef.current()
                    setActiveProvider(provider.id)
                    setResumePosition(progressRef.current.positionSeconds)
                    setIframeError(false)
                  }}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeProvider === provider.id
                      ? 'bg-amber-400 text-gray-950 shadow-md shadow-amber-400/10'
                      : 'bg-[#13171c] text-gray-300 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {provider.name}
                </button>
              ))}
            </div>

            {/* Iframe Player */}
            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/[0.1] shadow-2xl relative">
              {!iframeError ? (
                <iframe
                  ref={iframeRef}
                  src={iframeUrl}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="no-referrer"
                  onError={() => setIframeError(true)}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#13171c]">
                  <p className="text-gray-300 text-sm mb-4">This stream provider failed to load</p>
                  <button
                    onClick={() => setIframeError(false)}
                    className="px-4 py-2 bg-amber-400 text-gray-950 font-bold text-xs rounded-xl hover:bg-amber-300 transition-colors"
                  >
                    Retry Provider
                  </button>
                </div>
              )}
            </div>

            {/* Episode Info */}
            {mediaType === 'tv' && currentEpisode && (
              <div className="mt-4 p-4 bg-[#13171c] rounded-2xl border border-white/[0.06]">
                <h2 className="text-gray-100 font-semibold text-sm mb-1">{currentEpisode.name}</h2>
                {currentEpisode.overview && (
                  <p className="text-gray-400 text-xs leading-relaxed">{currentEpisode.overview}</p>
                )}
              </div>
            )}

            {/* Provider note */}
            <p className="text-gray-500 text-[11px] mt-3 text-center">
              Third-party streaming mirror. If one provider buffers, select Apollo, Athena, or Hermes above.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Watch
