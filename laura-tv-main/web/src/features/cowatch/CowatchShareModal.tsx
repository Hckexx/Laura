import { useState } from 'react'
import { getCowatchPublicUrl } from '../../config/public-url'
import { copyText, shareRoomInvite } from './share-utils'

interface CowatchShareModalProps {
  isOpen: boolean
  onClose: () => void
  roomCode: string
  shareSlug?: string | null
}

export function CowatchShareModal({
  isOpen,
  onClose,
  roomCode,
  shareSlug,
}: CowatchShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [shareStatus, setShareStatus] = useState('')

  if (!isOpen) return null

  const shareIdentifier = shareSlug || roomCode
  const shareUrl = getCowatchPublicUrl(shareIdentifier)

  const copyToClipboard = async (text: string, isLink: boolean) => {
    try {
      await copyText(navigator, text)
      if (isLink) {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      } else {
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
      }
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : 'Unable to copy. Select the text and copy it manually.')
    }
  }

  const handleNativeShare = async () => {
    try {
      const result = await shareRoomInvite(navigator, shareUrl)
      if (result === 'copied') {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      }
      setShareStatus(result === 'shared' ? 'Invite shared.' : result === 'copied' ? 'Link copied.' : '')
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : 'Unable to share this invite.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#13171c] border border-white/[0.12] rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-50 tracking-tight">Invite Friends</h2>
            <p className="text-xs text-gray-400 mt-0.5">Private room, accessible only with the direct link or code</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Private Share Link Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-gray-300">Private Room Link</label>
            <button type="button" onClick={handleNativeShare} className="text-xs font-semibold text-amber-300 hover:text-amber-200">
              Share
            </button>
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-[#0d0f12] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-gray-200 outline-none select-all"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(shareUrl, true)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                copiedLink
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'bg-amber-400 hover:bg-amber-300 text-gray-950 active:scale-[0.98]'
              }`}
            >
              {copiedLink ? 'Link copied' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Short Room Code Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-300">Room Code</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={roomCode}
              className="flex-1 bg-[#0d0f12] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-300 outline-none select-all"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(roomCode, false)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                copiedCode
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-gray-100 active:scale-[0.98]'
              }`}
            >
              {copiedCode ? 'Code copied' : 'Copy Code'}
            </button>
          </div>
        </div>

        {shareStatus ? <p role="status" className="text-center text-xs text-gray-300">{shareStatus}</p> : null}

        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
          No public listing or discovery exists. Anyone with the link or code can join this session.
        </p>
      </div>
    </div>
  )
}
