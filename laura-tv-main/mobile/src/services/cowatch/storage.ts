import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveRoom, StoredIdentity } from './types';

const identityKey = (roomCode: string) =>
  `@laura_tv_cowatch:identity:${roomCode.toUpperCase()}`;

const PREVIOUS_ROOM_LOCATOR_KEY = '@laura_tv_cowatch:previous_room_locator';
const ACTIVE_ROOM_KEY = '@laura_tv_cowatch:active_room';

// In-memory synchronous cache for instantaneous access during socket reconnections
const memoryIdentityMap = new Map<string, StoredIdentity>();
let memoryActiveRoom: ActiveRoom | null = null;
let memoryPreviousLocator: string | null = null;

export async function initCowatchStorage(): Promise<void> {
  try {
    const activeStr = await AsyncStorage.getItem(ACTIVE_ROOM_KEY);
    if (activeStr) {
      memoryActiveRoom = JSON.parse(activeStr);
    }
    const prevLocator = await AsyncStorage.getItem(PREVIOUS_ROOM_LOCATOR_KEY);
    if (prevLocator) {
      memoryPreviousLocator = prevLocator;
    }
  } catch {}
}

export function getRoomIdentity(roomCode: string): StoredIdentity | undefined {
  return memoryIdentityMap.get(roomCode.toUpperCase());
}

export async function getRoomIdentityAsync(
  roomCode: string,
): Promise<StoredIdentity | undefined> {
  const cached = memoryIdentityMap.get(roomCode.toUpperCase());
  if (cached) return cached;

  try {
    const stored = await AsyncStorage.getItem(identityKey(roomCode));
    if (stored) {
      const parsed = JSON.parse(stored) as StoredIdentity;
      memoryIdentityMap.set(roomCode.toUpperCase(), parsed);
      return parsed;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function getActiveRoom(): ActiveRoom | null {
  return memoryActiveRoom;
}

export async function saveActiveRoom(activeRoom: ActiveRoom): Promise<void> {
  const cleaned: ActiveRoom = {
    ...activeRoom,
    locator: activeRoom.locator.trim(),
  };
  memoryActiveRoom = cleaned;
  try {
    await AsyncStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(cleaned));
  } catch {}
}

export async function clearActiveRoom(locator?: string): Promise<void> {
  if (locator && memoryActiveRoom) {
    if (memoryActiveRoom.locator.toLowerCase() !== locator.trim().toLowerCase()) {
      return;
    }
  }
  memoryActiveRoom = null;
  try {
    await AsyncStorage.removeItem(ACTIVE_ROOM_KEY);
  } catch {}
}

export async function saveRoomIdentity(
  roomCode: string,
  identity: StoredIdentity,
): Promise<void> {
  const key = roomCode.toUpperCase();
  memoryIdentityMap.set(key, identity);
  try {
    await AsyncStorage.setItem(identityKey(roomCode), JSON.stringify(identity));
    await saveActiveRoom({
      locator: roomCode,
      participantId: identity.participantId,
      displayName: identity.displayName,
    });
  } catch {}
}

export async function removeRoomIdentity(roomCode: string): Promise<void> {
  const key = roomCode.toUpperCase();
  memoryIdentityMap.delete(key);
  try {
    await AsyncStorage.removeItem(identityKey(roomCode));
    await clearActiveRoom(roomCode);
  } catch {}
}

export function getPreviousRoomLocator(): string | null {
  return memoryPreviousLocator;
}

export async function savePreviousRoomLocator(locator: string): Promise<void> {
  const trimmed = locator.trim();
  if (trimmed) {
    memoryPreviousLocator = trimmed;
    try {
      await AsyncStorage.setItem(PREVIOUS_ROOM_LOCATOR_KEY, trimmed);
    } catch {}
  }
}

export async function clearPreviousRoomLocator(): Promise<void> {
  memoryPreviousLocator = null;
  try {
    await AsyncStorage.removeItem(PREVIOUS_ROOM_LOCATOR_KEY);
  } catch {}
}
