import {
  useState,
  useEffect,
  useRef,
} from 'react'

import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import Logo from './Logo'
import NavbarSearch from './NavbarSearch'

import {
  useKeyboardShortcuts,
} from '../../hooks/useKeyboardShortcuts'

import {
  ACTIVE_ROOM_CHANGED_EVENT,
  getActiveRoom,
  type ActiveRoom,
} from '../../features/cowatch/storage'

const PRIMARY_LINKS = [
  {
    path: '/',
    label: 'Home',
  },
  {
    path: '/watch',
    label: 'Watch',
  },
  {
    path: '/cowatch',
    label: 'Watch Together',
  },
  {
    path: '/watchlist',
    label: 'My List',
  },
]

function isActiveRoomPath(
  pathname: string,
  activeRoom: ActiveRoom | null,
) {
  if (!activeRoom) {
    return false
  }

  const locator =
    activeRoom.locator

  const encodedLocator =
    encodeURIComponent(
      locator,
    )

  return (
    pathname ===
      `/room/${locator}` ||
    pathname ===
      `/room/${encodedLocator}` ||
    pathname ===
      `/join/${locator}` ||
    pathname ===
      `/join/${encodedLocator}` ||
    pathname ===
      `/${locator}` ||
    pathname ===
      `/${encodedLocator}`
  )
}

function Navbar() {
  const location =
    useLocation()

  const navigate =
    useNavigate()

  const [searchParams] =
    useSearchParams()

  const [isOpen, setIsOpen] =
    useState(false)

  const [
    activeRoom,
    setActiveRoom,
  ] =
    useState<ActiveRoom | null>(
      () => getActiveRoom(),
    )

  const urlQuery =
    searchParams.get('q') || ''

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState(urlQuery)

  const searchInputRef =
    useRef<HTMLInputElement>(
      null,
    )

  const mobileInputRef =
    useRef<HTMLInputElement>(
      null,
    )

  useEffect(() => {
    if (
      location.pathname ===
      '/search'
    ) {
      setSearchQuery(
        urlQuery,
      )
    }
  }, [
    location.pathname,
    urlQuery,
  ])

  useEffect(() => {
    const refreshActiveRoom =
      () => {
        setActiveRoom(
          getActiveRoom(),
        )
      }

    window.addEventListener(
      ACTIVE_ROOM_CHANGED_EVENT,
      refreshActiveRoom,
    )

    window.addEventListener(
      'storage',
      refreshActiveRoom,
    )

    return () => {
      window.removeEventListener(
        ACTIVE_ROOM_CHANGED_EVENT,
        refreshActiveRoom,
      )

      window.removeEventListener(
        'storage',
        refreshActiveRoom,
      )
    }
  }, [])

  useKeyboardShortcuts({
    onSearch: () => {
      if (
        searchInputRef.current
      ) {
        searchInputRef.current
          .focus()

        searchInputRef.current
          .select()
      } else if (
        mobileInputRef.current
      ) {
        setIsOpen(true)

        setTimeout(
          () =>
            mobileInputRef.current
              ?.focus(),
          50,
        )
      }
    },

    onEscape: () => {
      setIsOpen(false)

      searchInputRef.current
        ?.blur()

      mobileInputRef.current
        ?.blur()
    },
  })

  useEffect(() => {
    setIsOpen(false)
  }, [
    location.pathname,
  ])

  const handleSearchSubmit = (
    e: React.FormEvent,
  ) => {
    e.preventDefault()

    const query =
      searchQuery.trim()

    if (query) {
      navigate(
        `/search?q=${encodeURIComponent(query)}`,
      )
    } else {
      navigate(
        '/search',
      )
    }
  }

  const returnToActiveRoom =
    () => {
      if (!activeRoom) {
        return
      }

      navigate(
        `/room/${encodeURIComponent(activeRoom.locator)}`,
      )
    }

  const showReturnToCowatch =
    Boolean(activeRoom) &&
    !isActiveRoomPath(
      location.pathname,
      activeRoom,
    )

  const isMac =
    typeof navigator !==
      'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(
      navigator.userAgent,
    )

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d0f12]/85 backdrop-blur-md border-b border-white/[0.08] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          <Link
            to="/"
            className="flex items-center gap-2.5 group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-lg p-1"
          >
            <Logo className="w-8 h-8 transition-transform duration-300 group-hover:scale-105" />

            <span className="text-xl font-bold tracking-tight">
              <span className="text-gray-100">
                LAURA
              </span>

              <span className="text-red-500 font-extrabold">
                {' '}TV
              </span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {PRIMARY_LINKS.map(
              (link) => {
                const isActive =
                  location.pathname ===
                  link.path

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'text-amber-300 bg-amber-400/10 border border-amber-400/25 shadow-sm'
                        : 'text-gray-300 hover:text-gray-100 hover:bg-white/[0.05]'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              },
            )}
          </div>

          <div className="hidden md:flex items-center justify-end flex-1 gap-3 max-w-md">
            {showReturnToCowatch && (
              <button
                type="button"
                onClick={
                  returnToActiveRoom
                }
                className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:border-amber-400/35 hover:bg-amber-400/[0.11] hover:text-amber-100"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-amber-300"
                />

                Return to Cowatch
              </button>
            )}

            <NavbarSearch
              inputRef={searchInputRef}
              isMac={isMac}
              query={searchQuery}
              setQuery={setSearchQuery}
              onSubmit={handleSearchSubmit}
              onSelect={(href) => navigate(href)}
            />
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => {
                setIsOpen(true)

                setTimeout(
                  () =>
                    mobileInputRef
                      .current
                      ?.focus(),
                  50,
                )
              }}
              aria-label="Search"
              className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            <button
              onClick={() =>
                setIsOpen(
                  !isOpen,
                )
              }
              aria-label="Toggle Navigation Menu"
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#0d0f12]/95 backdrop-blur-xl px-4 py-4 space-y-3">

          {showReturnToCowatch && (
            <button
              type="button"
              onClick={
                returnToActiveRoom
              }
              className="flex w-full items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-3.5 py-2.5 text-left text-sm font-semibold text-amber-200"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-amber-300"
              />

              Return to active Cowatch
            </button>
          )}

          <NavbarSearch
            inputRef={mobileInputRef}
            mobile
            query={searchQuery}
            setQuery={setSearchQuery}
            onSubmit={handleSearchSubmit}
            onSelect={(href) => navigate(href)}
            onNavigate={() => setIsOpen(false)}
          />

          <div className="space-y-1">
            {PRIMARY_LINKS.map(
              (link) => {
                const isActive =
                  location.pathname ===
                  link.path

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block px-3.5 py-2.5 rounded-lg text-base font-medium transition-colors ${
                      isActive
                        ? 'text-amber-300 bg-amber-400/10 border border-amber-400/25'
                        : 'text-gray-300 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              },
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
