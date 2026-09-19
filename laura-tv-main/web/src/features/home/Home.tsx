import { Link } from 'react-router-dom';

import AndroidDownload from '../releases/AndroidDownload';

interface Developer {
  name: string;
  role: string;
  initials: string;
  email: string;
  instagram: string;
}

const DEVELOPERS: Developer[] = [
  {
    name: 'Mohammed Ghouse',
    role: 'Co-founder',
    initials: 'MG',
    email: 'theunfilteredgoose@gmail.com',
    instagram: 'ghouseeeeee',
  },
  {
    name: 'Muhammed Usmaan',
    role: 'Co-founder',
    initials: 'MU',
    email: 'usmaan@gmail.com',
    instagram: 'usmaanibrahim.t',
  },
];

const CAPABILITIES = [
  {
    num: '01',
    title: 'Browse movies and TV shows',
    description:
      'Explore full library catalogs, release schedules, and comprehensive details.',
  },
  {
    num: '02',
    title: 'Create private Cowatch rooms',
    description:
      'Instant invitations via unique 6-character room codes or personal link slugs.',
  },
  {
    num: '03',
    title:
      'Watch together with synchronized playback',
    description:
      'Real-time playback synchronization so everyone stays in sync.',
  },
  {
    num: '04',
    title:
      'Chat, voice, and video while watching',
    description:
      'Integrated live mesh voice, video, and ephemeral room chat alongside the screen.',
  },
];

function Home() {
  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-1 select-none flex-col justify-between px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6 lg:px-8 lg:pt-8 xl:px-10">
      {/* Ambient Cinema Lighting Effect */}
      <div
        className="pointer-events-none absolute -top-36 left-1/2 h-[350px] w-[850px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(229,184,105,0.06)_0%,rgba(13,15,18,0)_70%)]"
        aria-hidden="true"
      />

      {/* Main section */}
      <div className="relative z-10 my-auto grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-10 xl:gap-12">
        {/* Left */}
        <div className="space-y-4 text-left lg:col-span-7">
          <h1 className="text-3xl font-extrabold leading-[1.12] tracking-[-0.035em] text-gray-100 sm:text-4xl lg:text-[44px] xl:text-[48px]">
            A private place to watch movies and shows,{' '}
            <span className="block font-serif font-normal italic text-amber-200/95 sm:inline">
              alone or together.
            </span>
          </h1>

          <div className="max-w-xl space-y-2 text-sm font-normal leading-relaxed text-gray-300 sm:text-[15px]">
            <p>
              LauraTV is a private streaming interface for
              browsing movies and TV shows, watching on your
              own, or starting a private Cowatch room with
              friends.
            </p>

            <p className="text-xs text-gray-400 sm:text-sm">
              It brings discovery, synchronized playback,
              chat, voice, and video into one place so movie
              nights feel less fragmented.
            </p>
          </div>

          {/* Main actions */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <Link
              to="/watch"
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-xl bg-[#e5b869] px-6 py-2.5 text-sm font-bold tracking-wide text-[#0d0f12] shadow-[0_2px_14px_rgba(229,184,105,0.2)] transition-all hover:bg-[#f0c77e] hover:shadow-[0_4px_22px_rgba(229,184,105,0.32)] active:scale-[0.98]"
            >
              <span>Browse Movies</span>

              <svg
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>

            <Link
              to="/cowatch"
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-xl border border-white/[0.12] bg-[#14181f] px-6 py-2.5 text-sm font-semibold tracking-wide text-gray-200 transition-all hover:border-amber-400/40 hover:bg-[#1c222c] hover:text-white active:scale-[0.98]"
            >
              <span
                className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                aria-hidden="true"
              />

              <span>
                Watch Together
              </span>
            </Link>
          </div>

          {/* Android */}
          <div className="pt-1">
            <AndroidDownload />
          </div>
        </div>

        {/* Developer cards */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:col-span-5">
          {DEVELOPERS.map(
            dev => (
              <div
                key={dev.name}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#111419]/90 p-4 text-left shadow-xl shadow-black/25 backdrop-blur-sm transition-all duration-200 hover:border-amber-400/35 sm:p-4.5"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-gradient-to-br from-[#1e2530] to-[#12161c] text-xs font-bold text-gray-200 shadow-inner">
                      {dev.initials}
                    </div>

                    <span className="rounded border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-gray-400">
                      Owner
                    </span>
                  </div>

                  <div className="truncate text-sm font-bold leading-tight text-gray-100 transition-colors group-hover:text-amber-200">
                    {dev.name}
                  </div>

                  <div className="mt-0.5 text-xs font-mono text-amber-400/90">
                    {dev.role}
                  </div>
                </div>

                <div className="mt-3.5 space-y-1.5 border-t border-white/[0.06] pt-2.5 text-xs">
                  <a
                    href={`mailto:${dev.email}`}
                    className="flex items-center gap-1.5 truncate font-mono text-gray-400 transition-colors hover:text-amber-300"
                    title={dev.email}
                  >
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-amber-400/80"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>

                    <span className="truncate">
                      {dev.email}
                    </span>
                  </a>

                  <a
                    href={`https://instagram.com/${dev.instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 truncate font-mono text-gray-400 transition-colors hover:text-pink-400"
                    title={`@${dev.instagram}`}
                  >
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-pink-400/80"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>

                    <span className="truncate">
                      @{dev.instagram.replace(/^@/, '')}
                    </span>
                  </a>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Capabilities */}
      <section className="relative z-10 mt-2 pt-2 sm:mt-3 sm:pt-3">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4.5 lg:grid-cols-4">
          {CAPABILITIES.map(
            cap => (
              <div
                key={cap.num}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#111419]/85 p-4 text-left shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-amber-400/35 hover:bg-[#161c24] sm:p-5"
              >
                <div className="space-y-2">
                  <div className="text-xs font-bold font-mono tracking-wider text-amber-400/90 sm:text-sm">
                    {cap.num}
                  </div>

                  <h2 className="text-sm font-bold leading-snug text-gray-100 transition-colors group-hover:text-amber-200 sm:text-[15px]">
                    {cap.title}
                  </h2>

                  <p className="text-xs leading-relaxed text-gray-400 sm:text-[13px]">
                    {cap.description}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;
