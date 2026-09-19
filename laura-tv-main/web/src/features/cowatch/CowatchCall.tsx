import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { cowatchUIConfig } from '../../config/cowatch-ui'
import type { CowatchRoom } from './types'
import type { useCowatchCall } from './useCowatchCall'

type MediaProps = {
  stream?: MediaStream
  muted?: boolean
  volume?: number
  label: string
}

function CallVideo({ stream, muted = false, volume = 1, label }: MediaProps) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.srcObject = stream ?? null
    ref.current.volume = volume
  }, [stream, volume])
  return (
    <video
      ref={ref}
      aria-label={label}
      autoPlay
      playsInline
      muted={muted}
      className="aspect-video w-full rounded-xl bg-black object-cover pointer-events-none select-none"
    />
  )
}

function CallAudio({ stream, volume = 1, label }: MediaProps) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.srcObject = stream ?? null
    ref.current.volume = volume
  }, [stream, volume])
  return <audio ref={ref} aria-label={label} autoPlay />
}

type DraggableTileProps = {
  id: string
  name: string
  isLocal: boolean
  stream?: MediaStream
  muted?: boolean
  volume?: number
  microphoneEnabled: boolean
  defaultOffset: { x: number; y: number }
  containerRef: React.RefObject<HTMLDivElement | null>
  onOverlayHoverChange?: (hovered: boolean) => void
}

function DraggableCameraTile({
  name,
  isLocal,
  stream,
  muted = false,
  volume = 1,
  microphoneEnabled,
  defaultOffset,
  containerRef,
  onOverlayHoverChange,
}: DraggableTileProps) {
  const [position, setPosition] = useState<{ x: number; y: number }>(defaultOffset)
  const tileRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{
    startX: number
    startY: number
    initialPosX: number
    initialPosY: number
  } | null>(null)

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Only drag on primary click / touch
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const currentTarget = e.currentTarget
    currentTarget.setPointerCapture(e.pointerId)
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    }
    onOverlayHoverChange?.(true)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return
    const deltaX = e.clientX - dragStartRef.current.startX
    const deltaY = e.clientY - dragStartRef.current.startY

    const targetX = dragStartRef.current.initialPosX + deltaX
    const targetY = dragStartRef.current.initialPosY + deltaY

    const containerRect = containerRef.current?.getBoundingClientRect()
    const tileRect = tileRef.current?.getBoundingClientRect()

    const minX = 8
    const minY = 8
    const maxX = Math.max(minX, (containerRect?.width ?? 400) - (tileRect?.width ?? 180) - 8)
    const maxY = Math.max(minY, (containerRect?.height ?? 300) - (tileRect?.height ?? 110) - 8)

    const clampedX = Math.min(Math.max(minX, targetX), maxX)
    const clampedY = Math.min(Math.max(minY, targetY), maxY)

    setPosition({ x: clampedX, y: clampedY })
  }

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Pointer capture may already be released when the gesture ends.
      }
      dragStartRef.current = null
    }
  }

  return (
    <div
      ref={tileRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => onOverlayHoverChange?.(true)}
      onMouseLeave={() => onOverlayHoverChange?.(false)}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      className="absolute left-0 top-0 z-30 w-44 sm:w-52 cursor-grab active:cursor-grabbing select-none touch-none rounded-2xl overflow-hidden border border-white/20 bg-black/80 shadow-2xl backdrop-blur-md transition-shadow hover:border-amber-400/50 hover:shadow-amber-400/10 pointer-events-auto group"
    >
      <CallVideo
        stream={stream}
        muted={muted}
        volume={volume}
        label={isLocal ? 'Your camera preview' : `${name}'s video`}
      />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-2.5 py-1.5 text-[11px] text-gray-100 flex items-center justify-between pointer-events-none">
        <span className="font-semibold truncate max-w-[65%]">
          {name} {isLocal && <span className="text-gray-400 font-normal">(you)</span>}
        </span>
        <span className="text-[10px] text-gray-300 shrink-0 font-medium ml-1">
          {microphoneEnabled ? 'Mic on' : 'Muted'}
        </span>
      </div>
    </div>
  )
}

type Props = {
  room: CowatchRoom
  participantId: string
  isFullscreen?: boolean
  overlaysVisible?: boolean
  onOverlayHoverChange?: (hovered: boolean) => void
  callState: ReturnType<typeof useCowatchCall>
}

function CowatchCall({
  room,
  participantId,
  isFullscreen = false,
  overlaysVisible = true,
  onOverlayHoverChange,
  callState: call,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentParticipant = room.participants.find(({ id }) => id === participantId)
  const remoteParticipants = room.participants.filter(
    ({ call: state, connected, id }) => state.joined && connected && id !== participantId,
  )

  const showLocalTile = isFullscreen
    ? (call.cameraEnabled && cowatchUIConfig.showLocalPreviewInFullscreen)
    : call.cameraEnabled

  const activeRemoteCameras = remoteParticipants.filter(({ call: state }) => state.cameraEnabled)

  // Calculate distinct initial positions for all active tiles
  const activeTileList = [
    ...(showLocalTile
      ? [{
          id: 'local',
          name: currentParticipant?.name ?? 'You',
          isLocal: true,
          stream: call.localStream,
          muted: true,
          volume: 1,
          microphoneEnabled: call.microphoneEnabled,
        }]
      : []),
    ...activeRemoteCameras.map((p) => ({
      id: p.id,
      name: p.name,
      isLocal: false,
      stream: call.remoteStreams[p.id],
      muted: false,
      volume: call.outputVolume,
      microphoneEnabled: p.call.microphoneEnabled,
    })),
  ]

  const getInitialOffset = (index: number) => {
    const tileWidth = 216
    const tileHeight = 135
    const columns = 2
    const col = index % columns
    const row = Math.floor(index / columns)
    return {
      x: 16 + col * tileWidth,
      y: 16 + row * tileHeight,
    }
  }

  return (
    <>
      {/* Remote audio elements must remain active in DOM at all times regardless of video state */}
      {remoteParticipants.map((participant) => (
        <CallAudio
          key={`audio-${participant.id}`}
          stream={call.remoteStreams[participant.id]}
          volume={call.outputVolume}
          label={`${participant.name}'s audio`}
        />
      ))}

      {/* Floating In-App Draggable Video Tiles Overlay */}
      {activeTileList.length > 0 && (
        <div
          ref={containerRef}
          className={`absolute inset-0 pointer-events-none z-20 overflow-hidden ${
            isFullscreen && !overlaysVisible ? 'opacity-90' : 'opacity-100'
          } transition-opacity duration-200`}
        >
          {activeTileList.map((tile, index) => (
            <DraggableCameraTile
              key={`camera-tile-${tile.id}`}
              id={tile.id}
              name={tile.name}
              isLocal={tile.isLocal}
              stream={tile.stream}
              muted={tile.muted}
              volume={tile.volume}
              microphoneEnabled={tile.microphoneEnabled}
              defaultOffset={getInitialOffset(index)}
              containerRef={containerRef}
              onOverlayHoverChange={onOverlayHoverChange}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default CowatchCall
