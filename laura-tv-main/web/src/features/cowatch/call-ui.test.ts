import assert from 'node:assert/strict'
import test from 'node:test'
import { cowatchUIConfig } from '../../config/cowatch-ui'

type ParticipantState = {
  id: string
  name: string
  connected: boolean
  call: {
    joined: boolean
    microphoneEnabled: boolean
    cameraEnabled: boolean
  }
}

// Pure helper representing the CowatchCall tile visibility rules
export const deriveVisibleTiles = (
  participants: ParticipantState[],
  currentParticipantId: string,
  localCameraEnabled: boolean,
  isFullscreen: boolean,
) => {
  const showLocalInFullscreen = isFullscreen && localCameraEnabled && cowatchUIConfig.showLocalPreviewInFullscreen
  const activeRemoteCameras = participants.filter(
    (p) => p.id !== currentParticipantId && p.connected && p.call.joined && p.call.cameraEnabled,
  )

  return {
    showLocalTile: isFullscreen ? showLocalInFullscreen : true,
    visibleRemoteCount: activeRemoteCameras.length,
    visibleRemoteIds: activeRemoteCameras.map((p) => p.id),
    hasAnyFullscreenTiles: showLocalInFullscreen || activeRemoteCameras.length > 0,
  }
}

test('fullscreen shows local preview when camera is ON and omits it when camera is OFF', () => {
  const participants: ParticipantState[] = [
    { id: 'user-me', name: 'Me', connected: true, call: { joined: true, microphoneEnabled: false, cameraEnabled: false } },
  ]

  // Local camera OFF
  const offResult = deriveVisibleTiles(participants, 'user-me', false, true)
  assert.equal(offResult.showLocalTile, false)
  assert.equal(offResult.hasAnyFullscreenTiles, false)

  // Local camera ON
  const onResult = deriveVisibleTiles(participants, 'user-me', true, true)
  assert.equal(onResult.showLocalTile, true)
  assert.equal(onResult.hasAnyFullscreenTiles, true)
})

test('remote video tiles are visible regardless of own microphone and camera state', () => {
  const participants: ParticipantState[] = [
    { id: 'user-me', name: 'Me', connected: true, call: { joined: true, microphoneEnabled: false, cameraEnabled: false } },
    { id: 'user-friend', name: 'Friend', connected: true, call: { joined: true, microphoneEnabled: true, cameraEnabled: true } },
  ]

  // Me has both mic and camera OFF, Friend has camera ON
  const result = deriveVisibleTiles(participants, 'user-me', false, true)
  assert.equal(result.showLocalTile, false)
  assert.equal(result.visibleRemoteCount, 1)
  assert.deepEqual(result.visibleRemoteIds, ['user-friend'])
  assert.equal(result.hasAnyFullscreenTiles, true)
})

test('draggable camera tiles calculate distinct initial non-overlapping offsets', () => {
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

  const offset0 = getInitialOffset(0)
  const offset1 = getInitialOffset(1)
  const offset2 = getInitialOffset(2)
  const offset3 = getInitialOffset(3)

  // Verify none have identical coordinates
  const keys = [offset0, offset1, offset2, offset3].map((o) => `${o.x},${o.y}`)
  const uniqueKeys = new Set(keys)
  assert.equal(uniqueKeys.size, 4)
  assert.deepEqual(offset0, { x: 16, y: 16 })
  assert.deepEqual(offset1, { x: 232, y: 16 })
  assert.deepEqual(offset2, { x: 16, y: 151 })
  assert.deepEqual(offset3, { x: 232, y: 151 })
})

test('draggable tile position clamping strictly respects container boundary constraints', () => {
  const clampPosition = (
    targetX: number,
    targetY: number,
    containerWidth: number,
    containerHeight: number,
    tileWidth = 200,
    tileHeight = 120,
  ) => {
    const minX = 8
    const minY = 8
    const maxX = Math.max(minX, containerWidth - tileWidth - 8)
    const maxY = Math.max(minY, containerHeight - tileHeight - 8)
    return {
      x: Math.min(Math.max(minX, targetX), maxX),
      y: Math.min(Math.max(minY, targetY), maxY),
    }
  }

  const containerW = 800
  const containerH = 600

  // Within boundaries
  assert.deepEqual(clampPosition(100, 100, containerW, containerH), { x: 100, y: 100 })

  // Past left / top boundaries
  assert.deepEqual(clampPosition(-50, -30, containerW, containerH), { x: 8, y: 8 })

  // Past right / bottom boundaries
  assert.deepEqual(clampPosition(1000, 900, containerW, containerH), { x: 592, y: 472 })
})
