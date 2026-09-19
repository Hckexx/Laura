import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { cowatchUIConfig } from '../../config/cowatch-ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { cowatchSocket, emitCowatchWithAck } from './socket'
import {
  clearPreviousRoomLocator,
  getRoomIdentity,
  removeRoomIdentity,
  savePreviousRoomLocator,
  saveRoomIdentity,
} from './storage'
import CowatchCall from './CowatchCall'
import { CowatchDrawer, type DrawerTab } from './CowatchDrawer'
import { CowatchControlBar } from './CowatchControlBar'
import { CowatchShareModal } from './CowatchShareModal'
import CowatchPlayer from './CowatchPlayer'
import type {
  CowatchMedia,
  CowatchMessage,
  CowatchPlayback,
  CowatchPlaybackRequest,
  CowatchResult,
  CowatchRoom,
  ProviderId,
} from './types'
import { useCowatchCall } from './useCowatchCall'
import { useCowatchFullscreen } from './useCowatchFullscreen'

type JoinResult = CowatchResult<{
  room: CowatchRoom
  participantId: string
  reconnectToken: string
  reconnected: boolean
}>

const DISCONNECTED_ROOM: CowatchRoom = {
  code: '',
  createdAt: 0,
  hostId: '',
  participants: [],
  maxParticipants: 5,
  media: null,
  playback: { playing: false, currentTime: 0, updatedAt: 0 },
  messages: [],
  chatMaxMessageLength: 500,
  syncIntervalMs: 2500,
  driftToleranceSeconds: 3,
  callConfig: {
    maxParticipants: 5,
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  },
}

function Room() {
  const params = useParams<{ roomCode?: string; shareSlug?: string }>()
  const rawLocator = (params.roomCode || params.shareSlug || '').trim()
  const code =
    rawLocator.length === 6 && !rawLocator.includes('-')
      ? rawLocator.toUpperCase()
      : rawLocator

  const navigate = useNavigate()
  const location = useLocation()

  const createdSession = (
    location.state as {
      cowatchCreated?: {
        room: CowatchRoom
        participantId: string
      }
    } | null
  )?.cowatchCreated

  const [displayName, setDisplayName] = useState(
    () => getRoomIdentity(code)?.displayName ?? '',
  )

  const [participantId, setParticipantId] = useState(
    () =>
      createdSession?.participantId ??
      getRoomIdentity(code)?.participantId,
  )

  const [room, setRoom] = useState<CowatchRoom | undefined>(
    () => createdSession?.room,
  )

  const [resyncKey, setResyncKey] = useState(0)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(
    cowatchUIConfig.chatPanelDefaultOpen,
  )

  const [drawerTab, setDrawerTab] = useState<DrawerTab>('chat')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  const [unreadChatCount, setUnreadChatCount] = useState(0)

  const [chatToast, setChatToast] = useState<{
    id: string
    senderName: string
    text: string
  } | null>(null)

  const toastTimeoutRef = useRef<number | undefined>(undefined)
  const isChatOpenRef = useRef(
    isDrawerOpen && drawerTab === 'chat',
  )
  const participantIdRef = useRef(participantId)

  const joinInFlightRef = useRef(false)

  const adoptedCreatedSocketRef = useRef(
    Boolean(createdSession && cowatchSocket.connected),
  )

  const fullscreenContainerRef = useRef<HTMLDivElement>(null)
  const fullscreen = useCowatchFullscreen(fullscreenContainerRef)

  useEffect(() => {
    participantIdRef.current = participantId
  }, [participantId])

  useEffect(() => {
    isChatOpenRef.current =
      isDrawerOpen && drawerTab === 'chat'

    if (isDrawerOpen && drawerTab === 'chat') {
      setUnreadChatCount(0)

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }

      setChatToast(null)
    }
  }, [isDrawerOpen, drawerTab])

  const join = useCallback(
    async (name: string, reconnectToken?: string) => {
      if (joinInFlightRef.current) return

      joinInFlightRef.current = true
      setJoining(true)
      setError('')

      try {
        const result =
          await emitCowatchWithAck<JoinResult>(
            'room:join',
            {
              roomCode: code,
              displayName: name,
              reconnectToken,
            },
          )

        if (!result.ok) {
          if (result.error.code === 'INVALID_ROOM') {
            removeRoomIdentity(code)
            clearPreviousRoomLocator()
          }

          setError(result.error.message)
          return
        }

        setRoom(result.room)
        setParticipantId(result.participantId)
        setResyncKey((current) => current + 1)

        saveRoomIdentity(code, {
          participantId: result.participantId,
          reconnectToken: result.reconnectToken,
          displayName: name,
        })
      } catch (connectionError) {
        setError(
          connectionError instanceof Error
            ? connectionError.message
            : 'Unable to connect to Cowatch.',
        )
      } finally {
        joinInFlightRef.current = false
        setJoining(false)
      }
    },
    [code],
  )

  useEffect(() => {
    const identity = getRoomIdentity(code)

    const onState = (nextRoom: CowatchRoom) => {
      setRoom(nextRoom)
    }

    const onMessage = (message: CowatchMessage) => {
      setRoom((currentRoom) => {
        if (
          !currentRoom ||
          currentRoom.messages.some(({ id }) => id === message.id)
        ) {
          return currentRoom
        }

        return {
          ...currentRoom,
          messages: [...currentRoom.messages, message],
        }
      })

      if (
        !isChatOpenRef.current &&
        message.senderId !== participantIdRef.current
      ) {
        setUnreadChatCount((previous) => previous + 1)

        setChatToast({
          id: message.id,
          senderName: message.senderName,
          text: message.text,
        })

        if (toastTimeoutRef.current) {
          window.clearTimeout(toastTimeoutRef.current)
        }

        toastTimeoutRef.current = window.setTimeout(() => {
          setChatToast(null)
        }, 4000)
      }
    }

    const onPlayback = (playback: CowatchPlayback) => {
      setRoom((currentRoom) =>
        currentRoom
          ? {
              ...currentRoom,
              playback,
            }
          : currentRoom,
      )
    }

    const onConnect = () => {
      const currentIdentity = getRoomIdentity(code)

      if (currentIdentity) {
        join(
          currentIdentity.displayName,
          currentIdentity.reconnectToken,
        )
      }
    }

    const onKicked = ({ reason }: { reason: string }) => {
      removeRoomIdentity(code)
      clearPreviousRoomLocator()

      joinInFlightRef.current = false

      setParticipantId(undefined)
      setRoom(undefined)
      setError(reason)

      cowatchSocket.disconnect()
    }

    const onConnectError = (connectionError: Error) => {
      joinInFlightRef.current = false
      setJoining(false)

      setError(
        connectionError.message ||
          'Unable to connect to Cowatch.',
      )
    }

    cowatchSocket.on('room:state', onState)
    cowatchSocket.on('chat:message', onMessage)
    cowatchSocket.on('playback:state', onPlayback)
    cowatchSocket.on('playback:sync', onPlayback)
    cowatchSocket.on('participant:kicked', onKicked)
    cowatchSocket.on('connect', onConnect)
    cowatchSocket.on('connect_error', onConnectError)

    if (identity) {
      if (
        adoptedCreatedSocketRef.current &&
        cowatchSocket.connected
      ) {
        adoptedCreatedSocketRef.current = false
      } else if (cowatchSocket.connected) {
        join(
          identity.displayName,
          identity.reconnectToken,
        )
      } else {
        cowatchSocket.connect()
      }
    }

    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }

      cowatchSocket.off('room:state', onState)
      cowatchSocket.off('chat:message', onMessage)
      cowatchSocket.off('playback:state', onPlayback)
      cowatchSocket.off('playback:sync', onPlayback)
      cowatchSocket.off('participant:kicked', onKicked)
      cowatchSocket.off('connect', onConnect)
      cowatchSocket.off('connect_error', onConnectError)
    }
  }, [code, join])

  const call = useCowatchCall({
    room:
      room ?? {
        ...DISCONNECTED_ROOM,
        code,
      },
    participantId: participantId ?? '',
    onError: setError,
  })

  useKeyboardShortcuts(
    {
      onToggleFullscreen: () => {
        void fullscreen.toggleFullscreen()
      },

      onToggleChat: () => {
        if (!isDrawerOpen) {
          setIsDrawerOpen(true)
          setDrawerTab('chat')
          return
        }

        if (drawerTab === 'chat') {
          setIsDrawerOpen(false)
          return
        }

        setDrawerTab('chat')
      },

      onTogglePeople: () => {
        if (!isDrawerOpen) {
          setIsDrawerOpen(true)
          setDrawerTab('people')
          return
        }

        if (drawerTab === 'people') {
          setIsDrawerOpen(false)
          return
        }

        setDrawerTab('people')
      },

      onToggleMic: () => {
        if (room && participantId) {
          call.toggleMicrophone()
        }
      },

      onToggleCam: () => {
        if (room && participantId) {
          call.toggleCamera()
        }
      },

      onEscape: () => {
        if (isShareModalOpen) {
          setIsShareModalOpen(false)
        } else if (isDrawerOpen) {
          setIsDrawerOpen(false)
        }
      },
    },
    Boolean(room && participantId),
  )

  const isHost = Boolean(
    room &&
      participantId &&
      room.hostId === participantId,
  )

  const sendChat = (text: string) => {
    if (!room || !participantId) return

    cowatchSocket.emit(
      'chat:send',
      { text },
      (
        result: CowatchResult<{
          message: CowatchMessage
        }>,
      ) => {
        if (!result.ok) {
          setError(result.error.message)
        }
      },
    )
  }

  const changeMedia = (media: CowatchMedia) => {
    if (!room) return

    cowatchSocket.emit(
      'media:change',
      { media },
      (result: CowatchResult) => {
        if (!result.ok) {
          setError(result.error.message)
        }
      },
    )
  }

  const changeProvider = (providerId: ProviderId) => {
    if (!room) return

    cowatchSocket.emit(
      'provider:change',
      { providerId },
      (result: CowatchResult) => {
        if (!result.ok) {
          setError(result.error.message)
        }
      },
    )
  }

  const setPlayback = (
    event: 'playback:play' | 'playback:pause',
    request?: CowatchPlaybackRequest,
  ) => {
    if (!room) return

    const actionRequest =
      request ?? {
        actionId:
          globalThis.crypto?.randomUUID?.() ??
          `room-action-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
        locallyApplied: false,
      }

    cowatchSocket.emit(
      event,
      actionRequest,
      (result: CowatchResult) => {
        if (!result.ok) {
          setError(result.error.message)
        }
      },
    )
  }

  const seek = (
    currentTime: number,
    request?: CowatchPlaybackRequest,
  ) => {
    if (!room) return

    cowatchSocket.emit(
      'playback:seek',
      {
        currentTime,
        ...request,
      },
      (result: CowatchResult) => {
        if (!result.ok) {
          setError(result.error.message)
        }
      },
    )
  }

  const sendTimeline = (
    currentTime: number,
    playing: boolean,
  ) => {
    if (!room || !isHost) return

    cowatchSocket.emit('playback:timeline', {
      currentTime,
      playing,
    })
  }

  const kickParticipant = (
    targetParticipantId: string,
  ) => {
    if (!room || !isHost) return

    cowatchSocket.emit(
      'participant:kick',
      {
        participantId: targetParticipantId,
      },
      (result: CowatchResult) => {
        if (!result.ok) {
          setError(result.error.message)
        }
      },
    )
  }

  const leaveRoom = async () => {
    savePreviousRoomLocator(code)
    removeRoomIdentity(code)

    try {
      await emitCowatchWithAck('room:leave', {})
    } catch {
      // Explicit leave is best-effort before disconnect.
    }

    cowatchSocket.disconnect()
    navigate('/cowatch')
  }

  const openChatFromToast = () => {
    setIsDrawerOpen(true)
    setDrawerTab('chat')
    setUnreadChatCount(0)

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }

    setChatToast(null)
  }

  if (!room || !participantId) {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-gray-100">
        <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#13171c] p-6 shadow-2xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-50">
              Join Private Lounge
            </h1>

            <p className="mt-1 text-xs text-gray-400">
              Room Code:{' '}
              <span className="font-mono font-bold tracking-wider text-amber-300">
                {code}
              </span>
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-200"
            >
              {error}
            </p>
          )}

          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault()

              const name = displayName.trim()

              if (!name) {
                setError('Enter a display name to join.')
                return
              }

              join(name)
            }}
            className="space-y-4"
          >
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold text-gray-300"
                htmlFor="cowatch-display-name"
              >
                Your Display Name
              </label>

              <input
                id="cowatch-display-name"
                maxLength={40}
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                placeholder="e.g. Alex"
                className="w-full rounded-xl border border-white/[0.1] bg-[#0d0f12] px-3.5 py-2 text-sm text-gray-100 outline-none transition-all placeholder:text-gray-500 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30"
              />
            </div>

            <button
              disabled={joining}
              className="w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-gray-950 shadow-lg shadow-amber-400/10 transition-all hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50"
            >
              {joining
                ? 'Connecting to Room…'
                : 'Enter Room'}
            </button>
          </form>

          <p className="text-center text-[11px] text-gray-500">
            Private room session. No account or registration required.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 text-gray-100 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-3">
          <Link
            to="/cowatch"
            className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-amber-300"
          >
            <span>←</span>
            Lounge
          </Link>

          <span className="text-gray-600">/</span>

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-gray-100 sm:text-base">
              {room.media?.type === 'tv'
                ? `TV Series (${
                    room.media.season !== undefined &&
                    room.media.season !== null
                      ? `S${room.media.season} `
                      : ''
                  }E${room.media.episode || 1})`
                : 'Movie Lounge'}
            </h1>

            <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
              {room.code}
            </span>

            {room.shareSlug && (
              <span className="hidden font-mono text-[11px] text-gray-400 sm:inline">
                /{room.shareSlug}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setIsShareModalOpen(true)
            }
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-400/20"
          >
            <span>🔗</span>
            Share Invite
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-200"
        >
          {error}
        </p>
      )}

      <div
        ref={fullscreenContainerRef}
        onMouseMove={fullscreen.showOverlays}
        className={
          fullscreen.isFullscreen
            ? 'relative h-[100dvh] w-screen overflow-hidden bg-black'
            : `relative grid items-start gap-4 ${
                isDrawerOpen
                  ? 'lg:grid-cols-[minmax(0,1fr)_22rem]'
                  : 'grid-cols-1'
              }`
        }
      >
        <div
          className={
            fullscreen.isFullscreen
              ? 'relative h-full min-w-0'
              : 'relative min-w-0'
          }
        >
          <CowatchPlayer
            media={room.media}
            playback={room.playback}
            participantId={participantId}
            isHost={isHost}
            syncIntervalMs={room.syncIntervalMs}
            driftToleranceSeconds={
              room.driftToleranceSeconds
            }
            resyncKey={resyncKey}
            isFullscreen={fullscreen.isFullscreen}
            overlaysVisible={fullscreen.overlaysVisible}
            onOverlayHoverChange={
              fullscreen.setOverlayHovered
            }
            onMediaChange={changeMedia}
            onPlay={(request) =>
              setPlayback(
                'playback:play',
                request,
              )
            }
            onPause={(request) =>
              setPlayback(
                'playback:pause',
                request,
              )
            }
            onSeek={seek}
            onTimeline={sendTimeline}
          />

          <CowatchCall
            room={room}
            participantId={participantId}
            isFullscreen={fullscreen.isFullscreen}
            overlaysVisible={fullscreen.overlaysVisible}
            onOverlayHoverChange={
              fullscreen.setOverlayHovered
            }
            callState={call}
          />

          {chatToast && (
            <div
              onClick={openChatFromToast}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' ||
                  event.key === ' '
                ) {
                  openChatFromToast()
                }
              }}
              className="pointer-events-auto absolute bottom-20 left-4 z-30 flex max-w-xs cursor-pointer items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-[#13171c]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all hover:border-amber-400/60 hover:bg-[#181d24] sm:max-w-sm"
              onMouseEnter={() =>
                fullscreen.setOverlayHovered(true)
              }
              onMouseLeave={() =>
                fullscreen.setOverlayHovered(false)
              }
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-xs font-bold text-amber-300">
                💬
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-amber-300">
                  {chatToast.senderName}
                </p>

                <p className="line-clamp-2 break-words text-xs text-gray-200">
                  {chatToast.text}
                </p>
              </div>
            </div>
          )}
        </div>

        <aside
          className={`${isDrawerOpen ? '' : 'hidden'} ${
            fullscreen.isFullscreen
              ? 'absolute right-0 top-0 bottom-[5.75rem] z-30 w-[min(23rem,88vw)]'
              : 'fixed inset-x-3 bottom-3 top-24 z-40 md:absolute md:inset-y-0 md:left-auto md:right-0 md:w-[22rem] lg:static lg:z-auto lg:h-full lg:w-auto'
          }`}
        >
          <CowatchDrawer
            activeTab={drawerTab}
            onTabChange={setDrawerTab}
            messages={room.messages}
            maxMessageLength={
              room.chatMaxMessageLength
            }
            onSendMessage={sendChat}
            participants={room.participants}
            hostId={room.hostId}
            myParticipantId={participantId}
            onKickParticipant={
              kickParticipant
            }
            onClose={() =>
              setIsDrawerOpen(false)
            }
            isFullscreen={
              fullscreen.isFullscreen
            }
            onOverlayHoverChange={
              fullscreen.setOverlayHovered
            }
          />
        </aside>

        <div
          className={
            fullscreen.isFullscreen
              ? `absolute inset-x-3 bottom-3 z-40 transition-opacity duration-200 ${
                  fullscreen.overlaysVisible
                    ? 'opacity-100'
                    : 'pointer-events-none opacity-0'
                }`
              : 'col-span-full'
          }
          onMouseEnter={() =>
            fullscreen.setOverlayHovered(true)
          }
          onMouseLeave={() =>
            fullscreen.setOverlayHovered(false)
          }
        >
          <CowatchControlBar
            microphoneEnabled={
              call.microphoneEnabled
            }
            cameraEnabled={
              call.cameraEnabled
            }
            outputVolume={call.outputVolume}
            activeProviderId={
              room.media?.providerId
            }
            isHost={isHost}
            isChatOpen={
              isDrawerOpen &&
              drawerTab === 'chat'
            }
            unreadChatCount={
              unreadChatCount
            }
            isPeopleOpen={
              isDrawerOpen &&
              drawerTab === 'people'
            }
            isFullscreen={
              fullscreen.isFullscreen
            }
            isPlaying={
              room.playback.playing
            }
            onPlay={() =>
              setPlayback('playback:play')
            }
            onPause={() =>
              setPlayback('playback:pause')
            }
            onToggleMic={
              call.toggleMicrophone
            }
            onToggleCam={
              call.toggleCamera
            }
            onChangeVolume={
              call.setOutputVolume
            }
            onChangeProvider={
              changeProvider
            }
            onOpenShareModal={() =>
              setIsShareModalOpen(true)
            }
            onToggleChat={() => {
              if (!isDrawerOpen) {
                setIsDrawerOpen(true)
                setDrawerTab('chat')
                return
              }

              if (drawerTab === 'chat') {
                setIsDrawerOpen(false)
                return
              }

              setDrawerTab('chat')
            }}
            onTogglePeople={() => {
              if (!isDrawerOpen) {
                setIsDrawerOpen(true)
                setDrawerTab('people')
                return
              }

              if (
                drawerTab === 'people'
              ) {
                setIsDrawerOpen(false)
                return
              }

              setDrawerTab('people')
            }}
            onToggleFullscreen={() =>
              void fullscreen.toggleFullscreen()
            }
            onLeaveRoom={leaveRoom}
          />
        </div>

        <CowatchShareModal
          isOpen={isShareModalOpen}
          onClose={() =>
            setIsShareModalOpen(false)
          }
          roomCode={room.code}
          shareSlug={room.shareSlug}
        />
      </div>
    </section>
  )
}

export default Room