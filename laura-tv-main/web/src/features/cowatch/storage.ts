const identityKey = (roomCode: string) =>
  `cowatch:identity:${roomCode.toUpperCase()}`

const PREVIOUS_ROOM_LOCATOR_KEY =
  'cowatch:previous_room_locator'

const ACTIVE_ROOM_KEY =
  'cowatch:active_room'

export const ACTIVE_ROOM_CHANGED_EVENT =
  'cowatch:active-room-changed'

export type StoredIdentity = {
  participantId: string
  reconnectToken: string
  displayName: string
}

export type ActiveRoom = {
  locator: string
  participantId: string
  displayName: string
}

function notifyActiveRoomChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new Event(ACTIVE_ROOM_CHANGED_EVENT),
    )
  }
}

export function getRoomIdentity(
  roomCode: string,
): StoredIdentity | undefined {
  try {
    const stored =
      sessionStorage.getItem(
        identityKey(roomCode),
      )

    return stored
      ? JSON.parse(stored) as StoredIdentity
      : undefined
  } catch {
    return undefined
  }
}

export function getActiveRoom():
  | ActiveRoom
  | null {
  try {
    const stored =
      sessionStorage.getItem(
        ACTIVE_ROOM_KEY,
      )

    if (!stored) {
      return null
    }

    const parsed =
      JSON.parse(
        stored,
      ) as Partial<ActiveRoom>

    if (
      typeof parsed.locator !==
        'string' ||
      !parsed.locator.trim() ||
      typeof parsed.participantId !==
        'string' ||
      !parsed.participantId ||
      typeof parsed.displayName !==
        'string' ||
      !parsed.displayName
    ) {
      return null
    }

    return {
      locator:
        parsed.locator.trim(),

      participantId:
        parsed.participantId,

      displayName:
        parsed.displayName,
    }
  } catch {
    return null
  }
}

export function saveActiveRoom(
  activeRoom: ActiveRoom,
) {
  try {
    sessionStorage.setItem(
      ACTIVE_ROOM_KEY,
      JSON.stringify({
        ...activeRoom,
        locator:
          activeRoom.locator.trim(),
      }),
    )

    notifyActiveRoomChanged()
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function clearActiveRoom(
  locator?: string,
) {
  try {
    if (locator) {
      const activeRoom =
        getActiveRoom()

      if (
        activeRoom &&
        activeRoom.locator
          .toLowerCase() !==
          locator
            .trim()
            .toLowerCase()
      ) {
        return
      }
    }

    sessionStorage.removeItem(
      ACTIVE_ROOM_KEY,
    )

    notifyActiveRoomChanged()
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function saveRoomIdentity(
  roomCode: string,
  identity: StoredIdentity,
) {
  try {
    sessionStorage.setItem(
      identityKey(roomCode),
      JSON.stringify(identity),
    )

    saveActiveRoom({
      locator: roomCode,
      participantId:
        identity.participantId,
      displayName:
        identity.displayName,
    })
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function removeRoomIdentity(
  roomCode: string,
) {
  try {
    sessionStorage.removeItem(
      identityKey(roomCode),
    )

    clearActiveRoom(
      roomCode,
    )
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function getPreviousRoomLocator():
  | string
  | null {
  try {
    return sessionStorage.getItem(
      PREVIOUS_ROOM_LOCATOR_KEY,
    )
  } catch {
    return null
  }
}

export function savePreviousRoomLocator(
  locator: string,
) {
  try {
    const trimmed =
      locator.trim()

    if (trimmed) {
      sessionStorage.setItem(
        PREVIOUS_ROOM_LOCATOR_KEY,
        trimmed,
      )
    }
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function clearPreviousRoomLocator() {
  try {
    sessionStorage.removeItem(
      PREVIOUS_ROOM_LOCATOR_KEY,
    )
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}
