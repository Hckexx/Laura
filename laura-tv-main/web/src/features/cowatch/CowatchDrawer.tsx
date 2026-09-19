import { type FormEvent, useEffect, useRef, useState } from 'react'
import { cowatchUIConfig } from '../../config/cowatch-ui'
import type { CowatchMessage, CowatchParticipant } from './types'

export type DrawerTab = 'chat' | 'people'

interface CowatchDrawerProps {
  activeTab: DrawerTab
  onTabChange: (tab: DrawerTab) => void
  messages: CowatchMessage[]
  maxMessageLength: number
  onSendMessage: (text: string) => void
  participants: CowatchParticipant[]
  hostId: string
  myParticipantId: string
  onKickParticipant?: (participantId: string) => void
  onClose?: () => void
  isFullscreen?: boolean
  onOverlayHoverChange?: (hovered: boolean) => void
}

export function CowatchDrawer({
  activeTab,
  onTabChange,
  messages,
  maxMessageLength,
  onSendMessage,
  participants,
  hostId,
  myParticipantId,
  onKickParticipant,
  onClose,
  isFullscreen = false,
  onOverlayHoverChange,
}: CowatchDrawerProps) {
  const [text, setText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const message = text.trim()
    if (!message) return
    onSendMessage(message)
    setText('')
  }

  const isHost = myParticipantId === hostId

  const containerStyle = isFullscreen
    ? {
        backgroundColor: `rgba(13, 15, 18, ${cowatchUIConfig.chatPanelOpacity})`,
        backdropFilter: `blur(${cowatchUIConfig.chatPanelBackdropBlurPx}px)`,
        WebkitBackdropFilter: `blur(${cowatchUIConfig.chatPanelBackdropBlurPx}px)`,
      }
    : undefined

  return (
    <div
      style={containerStyle}
      className={
        isFullscreen
          ? 'flex h-full w-full flex-col border-l border-white/[0.1] p-4 text-gray-100'
          : 'flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#13171c] p-4 shadow-xl text-gray-100'
      }
      onMouseEnter={() => onOverlayHoverChange?.(true)}
      onMouseLeave={() => onOverlayHoverChange?.(false)}
    >
      {/* Header with Tabs and Close Button */}
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex gap-1 bg-[#0d0f12] p-1 rounded-xl border border-white/[0.06]">
          <button
            type="button"
            onClick={() => onTabChange('chat')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'chat'
                ? 'bg-amber-400 text-gray-950 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Chat {messages.length > 0 && `(${messages.length})`}
          </button>
          <button
            type="button"
            onClick={() => onTabChange('people')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'people'
                ? 'bg-amber-400 text-gray-950 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            People ({participants.length})
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab 1: Chat View */}
      {activeTab === 'chat' && (
        <div className="flex flex-1 flex-col min-h-0">
          <div
            className={`flex-1 overflow-y-auto rounded-xl bg-[#0d0f12]/80 border border-white/[0.04] p-3.5 mb-3 scrollbar-thin ${
              isFullscreen ? 'min-h-[14rem]' : 'min-h-[18rem] max-h-[32rem]'
            }`}
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Session chat is ephemeral. Messages disappear when the room closes.</p>
            ) : (
              messages.map((message) => {
                const isMe = message.senderId === myParticipantId
                return (
                  <div key={message.id} className="mb-2.5 break-words text-xs sm:text-sm">
                    <span className={`font-semibold ${isMe ? 'text-amber-300' : 'text-gray-300'}`}>
                      {message.senderName}:
                    </span>{' '}
                    <span className="text-gray-100">{message.text}</span>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={submit} className="flex gap-2">
            <label className="sr-only" htmlFor="cowatch-chat-input">
              Chat Message
            </label>
            <input
              id="cowatch-chat-input"
              maxLength={maxMessageLength}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="is-chat-input min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[#0d0f12] px-3.5 py-2 text-xs sm:text-sm text-gray-100 placeholder-gray-400 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all"
              placeholder="Type a message..."
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:hover:bg-amber-400 px-4 py-2 text-xs sm:text-sm font-bold text-gray-950 transition-all active:scale-[0.98]"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: People View */}
      {activeTab === 'people' && (
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto space-y-2 py-1 pr-1">
          {participants.map((participant) => {
            const isParticipantHost = participant.id === hostId
            const isMe = participant.id === myParticipantId

            return (
              <div
                key={participant.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0d0f12]/80 border border-white/[0.04]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#1a1f26] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="text-xs font-semibold text-gray-100 truncate">
                        {participant.name} {isMe && <span className="text-gray-400 font-normal">(You)</span>}
                      </p>
                      {isParticipantHost && (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded shrink-0">
                          Host
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span>{participant.call.microphoneEnabled ? 'Mic on' : 'Muted'}</span>
                      <span>•</span>
                      <span>{participant.call.cameraEnabled ? 'Video on' : 'Video off'}</span>
                    </div>
                  </div>
                </div>

                {/* Host Kick Option */}
                {isHost && !isMe && onKickParticipant && (
                  <button
                    type="button"
                    onClick={() => onKickParticipant(participant.id)}
                    className="text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-500/20 px-2 py-1 rounded-lg transition-colors shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
