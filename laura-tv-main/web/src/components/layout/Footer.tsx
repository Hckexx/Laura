import {
  Link,
} from 'react-router-dom'

import Logo from './Logo'

const FOOTER_LINKS = [
  {
    to: '/',
    label: 'Home',
  },
  {
    to: '/watch',
    label: 'Watch',
  },
  {
    to: '/watchlist',
    label: 'My List',
  },
  {
    to: '/cowatch',
    label: 'Watch Together',
  },
  {
    to: '/copyright',
    label: 'Copyright Notice',
  },
]

function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-[#0b0d10] text-gray-400">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 shrink-0" />

            <div>
              <div className="text-sm font-bold tracking-tight text-gray-100">
                LAURA{' '}
                <span className="text-red-500">
                  TV
                </span>
              </div>

              <p className="text-[11px] text-gray-500">
                Private streaming lounge.
              </p>
            </div>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs"
          >
            {FOOTER_LINKS.map(
              (link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="transition-colors hover:text-amber-300"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default Footer
