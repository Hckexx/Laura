import {
  type FormEvent,
  useState,
} from 'react'

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import {
  emitCowatchWithAck,
} from './socket'

import {
  getActiveRoom,
  getPreviousRoomLocator,
  saveRoomIdentity,
  type ActiveRoom,
} from './storage'

import type {
  CowatchMedia,
  CowatchResult,
  CowatchRoom,
} from './types'

import MediaPicker from './MediaPicker'

import {
  completeMediaSelection,
  mediaTargetFromSearchParams,
} from './media-selection'

type CreateResult =
  CowatchResult<{
    room: CowatchRoom
    participantId: string
    reconnectToken: string
  }>

function Cowatch() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [initialTarget] = useState(() =>
    mediaTargetFromSearchParams(searchParams),
  )

  const [selectedMedia, setSelectedMedia] = useState<CowatchMedia | null>(() =>
    initialTarget ? completeMediaSelection(initialTarget) : null,
  )

  const [displayName, setDisplayName] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [roomLocator, setRoomLocator] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [activeRoom] = useState<ActiveRoom | null>(() => getActiveRoom())
  const [previousLocator] = useState<string | null>(() =>
    getPreviousRoomLocator(),
  )

  const createRoom = async (event: FormEvent) => {
    event.preventDefault()

    const name = displayName.trim()

    if (!name) {
      return setError('Enter a display name.')
    }

    if (!selectedMedia) {
      return setError(
        initialTarget?.type === 'tv'
          ? 'Choose a season and episode.'
          : 'Choose a movie or TV episode.',
      )
    }

    setPending(true)
    setError('')

    try {
      const result = await emitCowatchWithAck<CreateResult>('room:create', {
        displayName: name,
        initialMedia: selectedMedia,
        customSlug: customSlug.trim() || undefined,
      })

      if (!result.ok) {
        return setError(result.error.message)
      }

      saveRoomIdentity(result.room.code, {
        participantId: result.participantId,
        reconnectToken: result.reconnectToken,
        displayName: name,
      })

      navigate(`/room/${result.room.code}`, {
        state: {
          cowatchCreated: {
            room: result.room,
            participantId: result.participantId,
          },
        },
      })
    } catch (connectionError) {
      setError(
        connectionError instanceof Error
          ? connectionError.message
          : 'Unable to connect to Cowatch.',
      )
    } finally {
      setPending(false)
    }
  }

  const joinRoom = (event: FormEvent) => {
    event.preventDefault()

    const locator = roomLocator.trim()

    if (!locator) {
      return setError('Enter a room code or personal link slug.')
    }

    const cleaned = locator
      .replace(/^https?:\/\/[^/]+\//, '')
      .replace(/^\//, '')
      .replace(/^join\//, '')
      .replace(/^room\//, '')

    navigate(`/room/${cleaned}`)
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-16 pt-6 sm:pt-10 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto w-full">
      
      {/* Ambient Lighting */}
      <div 
        className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(229,184,105,0.06)_0%,rgba(13,15,18,0)_70%)]" 
        aria-hidden="true" 
      />

      <div className="relative z-10 space-y-8 sm:space-y-10 max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="text-center space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-[11px] font-mono font-semibold text-amber-300 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
            <span>Private Synchronized Lounge</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-100 tracking-[-0.03em] leading-tight">
            Watch Together
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-lg mx-auto">
            Create an invitation-only screening session with synchronized playback, live mesh video/audio, and ephemeral room chat.
          </p>
        </header>

        {/* Global Error Banner */}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-200 text-center font-mono max-w-2xl mx-auto"
          >
            {error}
          </p>
        )}

        {/* Main Dual-Wing Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Wing: Host a Screening */}
          <form
            onSubmit={createRoom}
            className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#111419]/90 backdrop-blur-sm p-5 sm:p-7 shadow-2xl space-y-5 text-left"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-100 tracking-tight">
                  Host a New Screening
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                  You will control stream playback and room permissions for guests.
                </p>
              </div>

              <span className="text-[10px] font-mono text-amber-400/80 bg-amber-400/[0.08] border border-amber-400/20 px-2.5 py-1 rounded-md uppercase tracking-wider hidden sm:block">
                Host Access
              </span>
            </div>

            <div className="space-y-4">
              
              {/* Display Name Input */}
              <div>
                <label
                  className="block text-xs font-semibold text-gray-300 mb-1.5"
                  htmlFor="cowatch-host-name"
                >
                  Your Display Name
                </label>

                <div className="relative flex items-center">
                  <svg className="w-4 h-4 absolute left-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    id="cowatch-host-name"
                    maxLength={40}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="e.g. Sara"
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0c0f13] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all"
                  />
                </div>
              </div>

              {/* Custom Slug Input */}
              <div>
                <label
                  className="block text-xs font-semibold text-gray-300 mb-1.5"
                  htmlFor="cowatch-slug"
                >
                  Custom Lounge Link{' '}
                  <span className="text-gray-500 font-normal">
                    (optional)
                  </span>
                </label>

                <div className="flex items-center rounded-xl border border-white/[0.1] bg-[#0c0f13] px-3.5 py-2 text-xs sm:text-sm text-gray-100 focus-within:border-amber-400/50 focus-within:ring-1 focus-within:ring-amber-400/30 transition-all">
                  <span className="text-xs text-gray-500 mr-1 select-none font-mono">
                    /
                  </span>

                  <input
                    id="cowatch-slug"
                    maxLength={50}
                    value={customSlug}
                    onChange={(event) =>
                      setCustomSlug(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ''),
                      )
                    }
                    placeholder="saras-movie-den"
                    className="w-full bg-transparent text-xs sm:text-sm text-gray-100 placeholder-gray-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Media Picker */}
              <div>
                <MediaPicker
                  initialTarget={initialTarget}
                  value={selectedMedia}
                  onChange={setSelectedMedia}
                />
              </div>
            </div>

            {/* Create Button */}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-gradient-to-r from-[#e5b869] to-[#f0c77e] hover:from-[#f0c77e] hover:to-[#fbd38d] active:scale-[0.98] text-[#0d0f12] font-bold py-3 text-xs sm:text-sm tracking-wide transition-all shadow-[0_2px_16px_rgba(229,184,105,0.2)] hover:shadow-[0_4px_24px_rgba(229,184,105,0.32)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {pending ? 'Opening Private Lounge…' : 'Create Room & Invite'}
              </span>
              {!pending && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>

          {/* Right Wing: Active Session, Join Existing Room & Experience Highlights */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            
            {/* Active Room Indicator */}
            {activeRoom && (
              <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#161b22] to-[#101318] p-4 sm:p-5 shadow-xl space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-300 animate-ping" aria-hidden="true" />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase">
                    Session In Progress
                  </span>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-100">
                    Cowatch is currently active
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Return to the screening room you are connected to.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/room/${encodeURIComponent(activeRoom.locator)}`)
                  }
                  className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-[#0d0f12] font-bold px-4 py-2 text-xs transition-all shadow-md shadow-amber-400/10 cursor-pointer"
                >
                  Return to Active Room
                </button>
              </div>
            )}

            {/* Previous Room Banner */}
            {previousLocator && !activeRoom && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#111419]/90 p-4 shadow-xl flex items-center justify-between gap-3 text-left">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    Recent Lounge
                  </div>
                  <div className="text-xs font-bold text-gray-200 font-mono mt-0.5">
                    {previousLocator}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/room/${previousLocator}`)}
                  className="rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-gray-100 font-semibold px-3 py-1.5 text-xs transition-colors border border-white/[0.1] cursor-pointer"
                >
                  Rejoin
                </button>
              </div>
            )}

            {/* Join Existing Room Form */}
            <form
              onSubmit={joinRoom}
              className="rounded-2xl border border-white/[0.08] bg-[#111419]/90 backdrop-blur-sm p-5 sm:p-6 shadow-2xl space-y-4 text-left"
            >
              <div>
                <h2 className="text-base font-bold text-gray-100 tracking-tight">
                  Join Existing Room
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                  Enter a 6-character room code or personal link slug.
                </p>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-gray-300 mb-1.5"
                  htmlFor="cowatch-join-code"
                >
                  Room Code or Link Slug
                </label>

                <div className="relative flex items-center">
                  <svg className="w-4 h-4 absolute left-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <input
                    id="cowatch-join-code"
                    value={roomLocator}
                    onChange={(event) => setRoomLocator(event.target.value)}
                    placeholder="e.g. K7Q2MP or saras-movie-den"
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0c0f13] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.98] border border-white/[0.1] text-gray-100 font-semibold py-2.5 text-xs sm:text-sm transition-all cursor-pointer"
              >
                Enter Room
              </button>
            </form>

            {/* Experience Guarantees Strip */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 space-y-2.5 text-left">
              <div className="text-[10px] font-mono tracking-widest text-gray-400 uppercase font-semibold">
                Lounge Features
              </div>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs">⚡</span>
                  <span>Real-time synchronized playback</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs">🎙️</span>
                  <span>Live mesh voice & video call</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs">💬</span>
                  <span>Ephemeral chat alongside stream</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs">🔒</span>
                  <span>No login or account creation needed</span>
                </li>
              </ul>
            </div>

          </div>

        </main>

      </div>
    </div>
  )
}

export default Cowatch