import { Link } from 'react-router-dom'
import { getWatchlist } from '../watchlist/storage'

function Profile() {
  const watchlist = getWatchlist()

  return (
    <div className="min-h-screen pb-20 pt-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-50 mb-2 tracking-tight">Personal Lounge</h1>
        <p className="text-sm text-gray-400">Private session settings and preferences</p>
      </div>

      {/* Preferences & Shortcuts Card */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Stats */}
        <div className="bg-[#13171c] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <span>🔖</span> Saved Titles
          </h2>
          <p className="text-xs text-gray-400">
            You currently have <span className="text-amber-300 font-bold">{watchlist.length}</span> items saved in your local watchlist.
          </p>
          <Link
            to="/watchlist"
            className="inline-block px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-gray-100 rounded-xl transition-colors border border-white/[0.08]"
          >
            View Watchlist →
          </Link>
        </div>

        {/* Keyboard Shortcuts Reference */}
        <div className="bg-[#13171c] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-3">
          <h2 className="text-base font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <span>⌨️</span> Keyboard Shortcuts
          </h2>
          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
              <span>Search anywhere</span>
              <kbd className="px-2 py-0.5 rounded bg-[#0d0f12] border border-white/[0.1] font-mono text-[11px] text-amber-300">Ctrl+K / ⌘K</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
              <span>Toggle Fullscreen</span>
              <kbd className="px-2 py-0.5 rounded bg-[#0d0f12] border border-white/[0.1] font-mono text-[11px] text-amber-300">F</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
              <span>Toggle Room Chat</span>
              <kbd className="px-2 py-0.5 rounded bg-[#0d0f12] border border-white/[0.1] font-mono text-[11px] text-amber-300">C</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
              <span>Toggle Room People</span>
              <kbd className="px-2 py-0.5 rounded bg-[#0d0f12] border border-white/[0.1] font-mono text-[11px] text-amber-300">P</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
              <span>Toggle Microphone</span>
              <kbd className="px-2 py-0.5 rounded bg-[#0d0f12] border border-white/[0.1] font-mono text-[11px] text-amber-300">M</kbd>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Toggle Camera</span>
              <kbd className="px-2 py-0.5 rounded bg-[#0d0f12] border border-white/[0.1] font-mono text-[11px] text-amber-300">V</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-[#13171c] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-2">
        <h2 className="text-base font-bold text-gray-100 tracking-tight flex items-center gap-2">
          <span>🔒</span> Privacy Architecture
        </h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          LauraTV has no public account registration, password databases, tracking pixels, or public directory indexes. Cowatch sessions are strictly private and code/slug-protected. Chat messages and WebRTC media streams are completely ephemeral.
        </p>
      </div>
    </div>
  )
}

export default Profile
