import { type ProviderId, providers } from '../player/providers'

interface CowatchControlBarProps {
  microphoneEnabled: boolean
  cameraEnabled: boolean
  outputVolume: number
  activeProviderId?: ProviderId
  isHost: boolean
  isChatOpen: boolean
  unreadChatCount?: number
  isPeopleOpen: boolean
  isFullscreen: boolean
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onToggleMic: () => void
  onToggleCam: () => void
  onChangeVolume: (volume: number) => void
  onChangeProvider?: (providerId: ProviderId) => void
  onOpenShareModal: () => void
  onToggleChat: () => void
  onTogglePeople: () => void
  onToggleFullscreen: () => void
  onLeaveRoom: () => void
}

export function CowatchControlBar({
  microphoneEnabled,
  cameraEnabled,
  outputVolume,
  activeProviderId = 'embedmaster',
  isHost,
  isChatOpen,
  unreadChatCount = 0,
  isPeopleOpen,
  isFullscreen,
  isPlaying,
  onPlay,
  onPause,
  onToggleMic,
  onToggleCam,
  onChangeVolume,
  onChangeProvider,
  onOpenShareModal,
  onToggleChat,
  onTogglePeople,
  onToggleFullscreen,
  onLeaveRoom,
}: CowatchControlBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/[0.1] bg-[#11151a]/95 p-2 text-gray-200 shadow-2xl backdrop-blur-xl">
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          className="min-w-20 rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-[#111318] transition-colors hover:bg-amber-200 active:scale-[0.98]"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={onToggleMic}
          title={microphoneEnabled ? 'Mute Microphone (M)' : 'Unmute Microphone (M)'}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            microphoneEnabled
              ? 'bg-white/[0.08] hover:bg-white/[0.14] text-gray-100 border border-white/[0.1]'
              : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
          }`}
        >
          {microphoneEnabled ? 'Mic on' : 'Muted'}
        </button>

        {/* Camera Toggle */}
        <button
          type="button"
          onClick={onToggleCam}
          title={cameraEnabled ? 'Turn off camera (V)' : 'Turn on camera (V)'}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            cameraEnabled
              ? 'bg-white/[0.08] hover:bg-white/[0.14] text-gray-100 border border-white/[0.1]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 border border-white/[0.06]'
          }`}
        >
          {cameraEnabled ? 'Camera on' : 'Camera off'}
        </button>

        {/* Output Volume */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/[0.08]">
          <span className="text-xs text-gray-400">Call volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={outputVolume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            title="Call Audio Volume"
            aria-label="Call Audio Volume"
            className="w-16 sm:w-20 accent-amber-400 h-1.5 bg-black/50 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {onChangeProvider && (
        <label className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/30 px-2.5 py-1.5 text-[11px] text-gray-400">
          Stream
          <select
            value={activeProviderId}
            onChange={(event) => onChangeProvider(event.target.value as ProviderId)}
            disabled={!isHost}
            aria-label="Stream provider"
            className="max-w-32 bg-transparent text-xs font-semibold text-gray-100 outline-none disabled:text-gray-400"
          >
            {providers.map((provider) => <option key={provider.id} value={provider.id} className="bg-[#11151a]">{provider.name}</option>)}
          </select>
        </label>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenShareModal}
          title="Share room link and code"
          className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-300/20 active:scale-[0.98]"
        >
          Invite
        </button>

        {/* Chat Toggle */}
        <button
          type="button"
          onClick={onToggleChat}
          title="Toggle Chat Drawer (C)"
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
            isChatOpen
              ? 'bg-white/[0.14] text-white border border-white/[0.15]'
              : 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 border border-white/[0.06]'
          }`}
        >
          <span>Chat</span>
          {!isChatOpen && unreadChatCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-gray-950">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* People Toggle */}
        <button
          type="button"
          onClick={onTogglePeople}
          title="Toggle People Panel (P)"
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            isPeopleOpen
              ? 'bg-white/[0.14] text-white border border-white/[0.15]'
              : 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 border border-white/[0.06]'
          }`}
        >
          People
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen (F)"
          className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/[0.1] hover:text-white"
        >
          {isFullscreen ? 'Exit full screen' : 'Full screen'}
        </button>

        {/* Leave Room Button */}
        <button
          type="button"
          onClick={onLeaveRoom}
          title="Leave Room"
          className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-500/20 transition-all text-xs font-semibold"
        >
          Leave
        </button>
      </div>
    </div>
  )
}
