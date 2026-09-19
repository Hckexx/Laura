import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPosterUrl, searchMovies, searchTVShows } from '../../services/media-api'
import type { MediaSearchResult } from '../../services/media-api/search'

type Suggestion = MediaSearchResult & { mediaType: 'movie' | 'tv' }

type Props = {
  inputRef: RefObject<HTMLInputElement | null>
  isMac?: boolean
  mobile?: boolean
  query: string
  setQuery: (query: string) => void
  onSubmit: (event: FormEvent) => void
  onSelect: (href: string) => void
  onNavigate?: () => void
}

const mergeSuggestions = (movies: MediaSearchResult[], shows: MediaSearchResult[]) => {
  const merged: Suggestion[] = []
  const seen = new Set<string>()
  const length = Math.max(movies.length, shows.length)
  for (let index = 0; index < length && merged.length < 8; index += 1) {
    const candidates: Suggestion[] = [
      ...(movies[index] ? [{ ...movies[index], mediaType: 'movie' as const }] : []),
      ...(shows[index] ? [{ ...shows[index], mediaType: 'tv' as const }] : []),
    ]
    for (const item of candidates) {
      const key = `${item.mediaType}:${item.id}`
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(item)
      }
      if (merged.length === 8) break
    }
  }
  return merged
}

export default function NavbarSearch({ inputRef, isMac, mobile = false, query, setQuery, onSubmit, onSelect, onNavigate }: Props) {
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [query])

  const canSuggest = debouncedQuery.length >= 2
  const { data, isFetching, isError } = useQuery({
    queryKey: ['navbar-suggestions', debouncedQuery.toLowerCase()],
    queryFn: async () => {
      const [movies, shows] = await Promise.all([
        searchMovies(debouncedQuery),
        searchTVShows(debouncedQuery),
      ])
      return mergeSuggestions(movies, shows)
    },
    enabled: canSuggest,
    staleTime: 1000 * 60 * 5,
  })

  const suggestions = useMemo(() => data || [], [data])
  const showPanel = isFocused && query.trim().length >= 2

  useEffect(() => {
    setActiveIndex(-1)
  }, [debouncedQuery])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel || suggestions.length === 0) {
      if (event.key === 'Escape') event.currentTarget.blur()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const item = suggestions[activeIndex]
      onSelect(item.mediaType === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsFocused(false)
      event.currentTarget.blur()
    }
  }

  return (
    <form onSubmit={onSubmit} className={`relative ${mobile ? 'mb-2' : 'w-full max-w-xs'}`} role="search">
      <div className="relative flex items-center">
        <svg className={`pointer-events-none absolute h-4 w-4 text-gray-400 ${mobile ? 'left-3.5' : 'left-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel ? `${mobile ? 'mobile-' : ''}search-suggestions` : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${mobile ? 'mobile-' : ''}suggestion-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder="Search movies & shows..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onKeyDown={handleKeyDown}
          className={mobile
            ? 'w-full rounded-xl border border-white/[0.12] bg-[#13171c] py-2 pl-10 pr-3.5 text-sm text-gray-100 outline-none placeholder:text-gray-400 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/30'
            : 'w-full rounded-full border border-white/[0.08] bg-[#13171c] py-1.5 pl-9 pr-14 text-xs text-gray-100 outline-none transition-all placeholder:text-gray-400 hover:bg-[#1a1f26] focus:border-amber-400/40 focus:bg-[#1a1f26] focus:ring-1 focus:ring-amber-400/40'}
        />
        {!mobile && (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        )}
      </div>

      {showPanel && (
        <div id={`${mobile ? 'mobile-' : ''}search-suggestions`} role="listbox" aria-label="Search suggestions" className={`absolute z-[70] mt-2 overflow-hidden rounded-2xl bg-[#111419] shadow-[0_16px_44px_rgba(0,0,0,0.55)] ${mobile ? 'left-0 right-0' : 'right-0 w-[23rem]'}`}>
          {isFetching && !data && <p className="px-4 py-5 text-sm text-gray-300">Finding titles…</p>}
          {isError && <p className="px-4 py-5 text-sm text-gray-300">Suggestions are unavailable. Press Enter to search.</p>}
          {!isFetching && !isError && suggestions.length === 0 && canSuggest && <p className="px-4 py-5 text-sm text-gray-300">No matching movies or series.</p>}
          {suggestions.map((item, index) => {
            const title = item.title || item.name || 'Untitled'
            const year = (item.release_date || item.first_air_date || '').slice(0, 4)
            const href = item.mediaType === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`
            const poster = getPosterUrl(item.poster_path)
            return (
              <Link
                id={`${mobile ? 'mobile-' : ''}suggestion-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                key={`${item.mediaType}:${item.id}`}
                to={href}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={onNavigate}
                className={`flex min-h-16 items-center gap-3 px-3 py-2.5 transition-colors focus:outline-none focus-visible:bg-amber-400/10 ${activeIndex === index ? 'bg-amber-400/10' : 'hover:bg-white/[0.05]'}`}
              >
                <div className="h-12 w-8 shrink-0 overflow-hidden rounded-md bg-[#20252d]">
                  {poster && <img src={poster} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-100">{title}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{item.mediaType === 'movie' ? 'Movie' : 'Series'}{year ? ` · ${year}` : ''}</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </Link>
            )
          })}
          {suggestions.length > 0 && (
            <Link to={`/search?q=${encodeURIComponent(query.trim())}`} onClick={onNavigate} className="flex items-center justify-center border-t border-white/[0.07] px-4 py-3 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-400/[0.08] focus:outline-none focus-visible:bg-amber-400/[0.08]">
              View all results for “{query.trim()}”
            </Link>
          )}
        </div>
      )}
    </form>
  )
}
