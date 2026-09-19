import { type FormEvent, useEffect, useRef, useState } from 'react'
import { cowatchUIConfig } from '../../config/cowatch-ui'
import type { CowatchMessage } from './types'

type Props = {
  messages: CowatchMessage[]
  maxMessageLength: number
  onSend: (text: string) => void
  onClose?: () => void
  isFullscreen?: boolean
  onOverlayHoverChange?: (hovered: boolean) => void
}

function CowatchChat({
  messages,
  maxMessageLength,
  onSend,
  onClose,
  isFullscreen = false,
  onOverlayHoverChange,
}: Props) {
  const [text, setText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const message = text.trim()
    if (!message) return
    onSend(message)
    setText('')
  }

  const containerStyle = isFullscreen
    ? {
        backgroundColor: `rgba(0, 0, 0, ${cowatchUIConfig.chatPanelOpacity})`,
        backdropFilter: `blur(${cowatchUIConfig.chatPanelBackdropBlurPx}px)`,
        WebkitBackdropFilter: `blur(${cowatchUIConfig.chatPanelBackdropBlurPx}px)`,
      }
    : undefined

  return (
    <div
      style={containerStyle}
      className={
        isFullscreen
          ? 'flex h-full w-full flex-col border-l border-white/15 p-4'
          : 'flex h-full flex-col rounded-xl border border-white/10 bg-white/5 p-5'
      }
      onMouseEnter={() => onOverlayHoverChange?.(true)}
      onMouseLeave={() => onOverlayHoverChange?.(false)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Room chat</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div
        className={`flex-1 overflow-y-auto rounded-lg bg-black/40 p-3 mb-3 scrollbar-thin ${
          isFullscreen ? 'min-h-[14rem]' : 'min-h-[18rem] max-h-[30rem]'
        }`}
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <p key={message.id} className="mb-2 break-words text-sm">
              <strong className="text-red-400">{message.senderName}:</strong>{' '}
              <span className="text-gray-100">{message.text}</span>
            </p>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor="cowatch-chat-message">
          Message
        </label>
        <input
          id="cowatch-chat-message"
          maxLength={maxMessageLength}
          value={text}
          onChange={(event) => setText(event.target.value)}
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
  )
}

export default CowatchChat
