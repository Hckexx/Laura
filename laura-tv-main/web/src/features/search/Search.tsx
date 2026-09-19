import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  searchMovies,
  searchTVShows,
  fetchTrendingMovies,
  fetchTopRatedMovies,
  fetchTrendingTVShows,
} from '../../services/media-api'
import MediaGrid from '../../components/media/MediaGrid'
import GenrePills from '../../components/media/GenrePills'

function Search() {
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') || '').trim()
  const [activeTab, setActiveTab] = useState<'trending' | 'top-rated'>('trending')

  // Fetch default content (shown when no search query is present)
  const { data: trendingMovies, isLoading: trendingMoviesLoading } = useQuery({
    queryKey: ['trendingMovies'],
    queryFn: fetchTrendingMovies,
    enabled: query.length === 0 && activeTab === 'trending',
  })

  const { data: trendingTV, isLoading: trendingTVLoading } = useQuery({
    queryKey: ['trendingTV'],
    queryFn: fetchTrendingTVShows,
    enabled: query.length === 0 && activeTab === 'trending',
  })

  const { data: topRatedMovies, isLoading: topRatedLoading } = useQuery({
    queryKey: ['topRatedMovies'],
    queryFn: fetchTopRatedMovies,
    enabled: query.length === 0 && activeTab === 'top-rated',
  })

  // Fetch search results when query exists
  const { data: movieResults, isLoading: moviesLoading } = useQuery({
    queryKey: ['searchMovies', query],
    queryFn: () => searchMovies(query),
    enabled: query.length > 0,
  })

  const { data: tvResults, isLoading: tvLoading } = useQuery({
    queryKey: ['searchTV', query],
    queryFn: () => searchTVShows(query),
    enabled: query.length > 0,
  })

  const hasSearched = query.length > 0
  const isLoading = moviesLoading || tvLoading

  const movies = movieResults || []
  const tvShows = tvResults || []
  const totalResults = movies.length + tvShows.length

  // Default content
  const defaultMovies = activeTab === 'trending' ? (trendingMovies || []) : (topRatedMovies || [])
  const defaultTV = activeTab === 'trending' ? (trendingTV || []) : []
  const defaultLoading = activeTab === 'trending' ? (trendingMoviesLoading || trendingTVLoading) : topRatedLoading

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-20">
      
      {/* Ambient Lighting */}
      <div 
        className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(229,184,105,0.05)_0%,rgba(13,15,18,0)_70%)]" 
        aria-hidden="true" 
      />

      {/* Search Results View */}
      {hasSearched ? (
        <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Results Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/[0.07] text-left">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.2em] text-amber-400 uppercase">
                <span>Search Query Results</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-100 tracking-[-0.03em]">
                Results for <span className="font-serif italic text-amber-200 font-normal">&ldquo;{query}&rdquo;</span>
              </h1>
            </div>

            {!isLoading && (
              <div className="text-xs font-mono text-gray-400 px-3 py-1 rounded-lg bg-[#111419] border border-white/[0.08]">
                {totalResults} {totalResults === 1 ? 'title' : 'titles'} indexed
              </div>
            )}
          </header>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5 lg:gap-6">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-[2/3] w-full rounded-xl bg-[#13171d]/80 border border-white/[0.05] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* No Results State */}
          {!isLoading && totalResults === 0 && (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center rounded-2xl border border-white/[0.06] bg-[#111419]/60 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-gray-500 mb-3.5">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-100 mb-1">No matching titles found</h2>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                Check your spelling, or try searching for keywords, actors, directors, or broad genres.
              </p>
            </div>
          )}

          {/* Results Sections */}
          {!isLoading && totalResults > 0 && (
            <div className="space-y-12 pb-12 text-left">
              {movies.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                    <h2 className="text-lg font-bold text-gray-100 tracking-tight flex items-center gap-2.5">
                      <span>Feature Films</span>
                      <span className="text-xs font-mono text-amber-400/80 font-normal">({movies.length})</span>
                    </h2>
                  </div>
                  <MediaGrid items={movies} mediaType="movie" />
                </section>
              )}

              {tvShows.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                    <h2 className="text-lg font-bold text-gray-100 tracking-tight flex items-center gap-2.5">
                      <span>Television Series</span>
                      <span className="text-xs font-mono text-amber-400/80 font-normal">({tvShows.length})</span>
                    </h2>
                  </div>
                  <MediaGrid items={tvShows} mediaType="tv" />
                </section>
              )}
            </div>
          )}

        </div>
      ) : (
        /* Default Browse View (when query is empty) */
        <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/[0.07] text-left">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.2em] text-amber-400 uppercase">
                <span>Discovery Terminal</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-100 tracking-[-0.03em]">
                Search &amp; Explore
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 max-w-lg">
                Use the search input above to find specific titles, or browse trending and top-rated catalog streams below.
              </p>
            </div>

            {/* Switcher */}
            <div className="flex gap-1.5 p-1 rounded-xl bg-[#111419] border border-white/[0.08] shrink-0">
              <button
                onClick={() => setActiveTab('trending')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === 'trending'
                    ? 'bg-amber-400 text-[#0d0f12] shadow-sm font-bold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => setActiveTab('top-rated')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === 'top-rated'
                    ? 'bg-amber-400 text-[#0d0f12] shadow-sm font-bold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                }`}
              >
                Top Rated
              </button>
            </div>
          </header>

          {/* Genre Explorer */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111419]/80 p-5 sm:p-6 shadow-xl">
            <GenrePills />
          </div>

          {/* Loading State */}
          {defaultLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5 lg:gap-6">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-[2/3] w-full rounded-xl bg-[#13171d]/80 border border-white/[0.05] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Default Media Grids */}
          {!defaultLoading && (
            <div className="pb-12 space-y-12 text-left">
              {defaultMovies.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                    <h2 className="text-lg font-bold text-gray-100 tracking-tight">
                      {activeTab === 'trending' ? 'Trending Feature Films' : 'Top Rated Masterpieces'}
                    </h2>
                  </div>
                  <MediaGrid items={defaultMovies} mediaType="movie" />
                </section>
              )}

              {activeTab === 'trending' && defaultTV.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                    <h2 className="text-lg font-bold text-gray-100 tracking-tight">
                      Trending Television Series
                    </h2>
                  </div>
                  <MediaGrid items={defaultTV} mediaType="tv" />
                </section>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default Search
