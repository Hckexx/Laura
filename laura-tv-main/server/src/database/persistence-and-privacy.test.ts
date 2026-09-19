import assert from 'node:assert/strict';
import test from 'node:test';
import { cowatchConfig } from '../realtime/config.js';
import { RoomStore } from '../realtime/room-store.js';
import { normalizeShareSlug, generateRandomShareSlug } from '../realtime/slug-utils.js';
import type { ICowatchRoomsRepository, PersistedRoomSnapshot } from './types.js';
import type { PlaybackState, RoomMedia } from '../realtime/types.js';
import { CowatchRoomsRepository } from './rooms-repository.js';

class MockRoomsRepository implements ICowatchRoomsRepository {
  public readonly records = new Map<string, {
    code: string;
    shareSlug: string | null;
    createdAt: number;
    lastActivityAt: number;
    expiresAt: number;
    media: RoomMedia | null;
    playback: PlaybackState;
  }>();

  public calls = {
    createRoom: 0,
    getRoomByExactCode: 0,
    getRoomByLocator: 0,
    isCodePersisted: 0,
    isLocatorPersisted: 0,
    updateSnapshot: 0,
    touchActivity: 0,
    deleteExpiredRooms: 0,
  };

  private readonly inactivityMs: number;

  constructor(inactivityMs = 900_000) {
    this.inactivityMs = inactivityMs;
  }

  async createRoom(
    code: string,
    shareSlug: string | null = null,
    media: RoomMedia | null = null,
    playback: PlaybackState = { playing: false, currentTime: 0, updatedAt: Date.now() }
  ): Promise<PersistedRoomSnapshot | null> {
    this.calls.createRoom += 1;
    const normalized = code.trim().toUpperCase();
    const normalizedSlug = shareSlug ? shareSlug.trim().toLowerCase() : null;
    const now = Date.now();
    const record = {
      code: normalized,
      shareSlug: normalizedSlug,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + this.inactivityMs,
      media,
      playback,
    };
    this.records.set(normalized, record);
    return record;
  }

  async getRoomByExactCode(code: string): Promise<PersistedRoomSnapshot | null> {
    this.calls.getRoomByExactCode += 1;
    return this.getRoomByLocator(code);
  }

  async getRoomByLocator(locator: string): Promise<PersistedRoomSnapshot | null> {
    this.calls.getRoomByLocator += 1;
    const raw = locator.trim();
    if (!raw) return null;
    const normalizedCode = raw.toUpperCase();
    const normalizedSlug = raw.toLowerCase();

    for (const record of this.records.values()) {
      if (record.code === normalizedCode || (record.shareSlug && record.shareSlug === normalizedSlug)) {
        if (record.expiresAt <= Date.now()) return null;
        return record;
      }
    }
    return null;
  }

  async isCodePersisted(code: string): Promise<boolean> {
    this.calls.isCodePersisted += 1;
    return this.isLocatorPersisted(code);
  }

  async isLocatorPersisted(locator: string): Promise<boolean> {
    this.calls.isLocatorPersisted += 1;
    const raw = locator.trim();
    if (!raw) return false;
    const normalizedCode = raw.toUpperCase();
    const normalizedSlug = raw.toLowerCase();

    for (const record of this.records.values()) {
      if (record.code === normalizedCode || (record.shareSlug && record.shareSlug === normalizedSlug)) {
        return record.expiresAt > Date.now();
      }
    }
    return false;
  }

  async updateSnapshot(code: string, media: RoomMedia | null, playback: PlaybackState): Promise<boolean> {
    this.calls.updateSnapshot += 1;
    const normalized = code.trim().toUpperCase();
    const record = this.records.get(normalized);
    if (!record) return false;
    const now = Date.now();
    record.media = media;
    record.playback = playback;
    record.lastActivityAt = now;
    record.expiresAt = now + this.inactivityMs;
    return true;
  }

  async touchActivity(code: string): Promise<boolean> {
    this.calls.touchActivity += 1;
    const normalized = code.trim().toUpperCase();
    const record = this.records.get(normalized);
    if (!record) return false;
    const now = Date.now();
    record.lastActivityAt = now;
    record.expiresAt = now + this.inactivityMs;
    return true;
  }

  async deleteExpiredRooms(): Promise<number> {
    this.calls.deleteExpiredRooms += 1;
    let count = 0;
    const now = Date.now();
    for (const [code, record] of this.records.entries()) {
      if (record.expiresAt <= now) {
        this.records.delete(code);
        count += 1;
      }
    }
    return count;
  }
}

test('slug normalization and generation rules', () => {
  assert.equal(normalizeShareSlug('Saras-Personal-Den'), 'saras-personal-den');
  assert.equal(normalizeShareSlug('  my_awesome--room!  '), 'my-awesome-room');
  assert.equal(normalizeShareSlug('ab'), null); // too short (<3)
  assert.equal(normalizeShareSlug('api'), null); // reserved
  assert.equal(normalizeShareSlug('cowatch'), null); // reserved
  assert.equal(normalizeShareSlug('watch'), null); // reserved

  const randomSlug = generateRandomShareSlug();
  assert.ok(randomSlug.length >= 6);
  assert.match(randomSlug, /^[a-z]+-[a-z]+-\d+$/);
});

test('persists room creation and supports share slugs', async () => {
  const repo = new MockRoomsRepository();
  const store = new RoomStore(cowatchConfig.room, repo);

  const created = await store.createRoom('Host', 'socket-1', { type: 'movie', id: 550, providerId: 'embedmaster' }, 'saras-movie-lounge');
  assert.equal('error' in created, false);
  if ('error' in created) return;

  assert.equal(repo.calls.createRoom, 1);
  assert.equal(created.room.shareSlug, 'saras-movie-lounge');
  const record = repo.records.get(created.room.code);
  assert.equal(record?.shareSlug, 'saras-movie-lounge');
  assert.equal(record?.media?.id, 550);
  assert.equal(record?.media?.providerId, 'embedmaster');

  store.close();
});

test('locator lookup resolves room by both exact code and exact share slug', async () => {
  const repo = new MockRoomsRepository();
  const store1 = new RoomStore(cowatchConfig.room, repo);

  const initialMedia = { type: 'movie' as const, id: 100, providerId: 'embedmaster' as const };
  const created = await store1.createRoom('Host A', 'socket-a', initialMedia, 'custom-slug-42');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const roomCode = created.room.code;

  // Restart / clear runtime memory
  store1.close();
  const store2 = new RoomStore(cowatchConfig.room, repo);

  // Join by share slug
  const joinedBySlug = await store2.joinRoom('custom-slug-42', 'Viewer Slug', 'socket-slug');
  assert.equal('error' in joinedBySlug, false);
  if ('error' in joinedBySlug) return;
  assert.equal(joinedBySlug.room.code, roomCode);
  assert.equal(joinedBySlug.room.shareSlug, 'custom-slug-42');

  // Join by room code
  const joinedByCode = await store2.joinRoom(roomCode, 'Viewer Code', 'socket-code');
  assert.equal('error' in joinedByCode, false);
  if ('error' in joinedByCode) return;
  assert.equal(joinedByCode.room.code, roomCode);

  store2.close();
});

test('SEASON 0 RESTORE: TV specials with season=0 restore correctly without dropping season/episode', async () => {
  const repo = new MockRoomsRepository();
  const store1 = new RoomStore(cowatchConfig.room, repo);

  const season0Media = {
    type: 'tv' as const,
    id: 1399,
    season: 0,
    episode: 2,
    providerId: 'embedmaster' as const,
  };

  const created = await store1.createRoom('Host Special', 'socket-spec', season0Media);
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const roomCode = created.room.code;

  // Simulate server restart
  store1.close();
  const store2 = new RoomStore(cowatchConfig.room, repo);

  const joined = await store2.joinRoom(roomCode, 'Viewer Special', 'socket-v');
  assert.equal('error' in joined, false);
  if ('error' in joined) return;

  assert.deepEqual(joined.room.media, season0Media);
  assert.equal(joined.room.media?.season, 0);
  assert.equal(joined.room.media?.episode, 2);

  store2.close();
});

test('rejects expired rooms after inactivity and cleans up on interval', async () => {
  const shortInactivityMs = 50;
  const repo = new MockRoomsRepository(shortInactivityMs);
  const store = new RoomStore({ ...cowatchConfig.room, emptyRoomExpiryMs: 10 }, repo);

  const created = await store.createRoom('Host', 'socket-h');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const code = created.room.code;

  // Leave room so runtime clears
  store.leaveBySocket('socket-h', true, () => undefined);

  // Wait past inactivity expiry
  await new Promise((resolve) => setTimeout(resolve, 80));

  const joined = await store.joinRoom(code, 'Late Joiner', 'socket-late');
  assert.deepEqual(joined, { error: 'INVALID_ROOM' });

  // Cleanup removes expired records
  const deletedCount = await store.cleanupExpiredRooms();
  assert.ok(deletedCount >= 1);
  assert.equal(repo.records.has(code), false);

  store.close();
});

test('PRIVACY GUARANTEE: chat and participants are NEVER persisted to database', async () => {
  const repo = new MockRoomsRepository();
  const store = new RoomStore(cowatchConfig.room, repo);

  const created = await store.createRoom('Secret Host', 'socket-host');
  assert.equal('error' in created, false);
  if ('error' in created) return;

  const joined = await store.joinRoom(created.room.code, 'Secret Viewer', 'socket-viewer');
  assert.equal('error' in joined, false);
  if ('error' in joined) return;

  // Send sensitive chat messages
  store.addMessage(created.room.code, created.participant.id, 'Private message 1');
  store.addMessage(created.room.code, joined.participant.id, 'Private message 2');

  const persistedRow = repo.records.get(created.room.code);
  assert.ok(persistedRow);

  // Verify the persisted record has no participant names or messages
  assert.equal('participants' in persistedRow, false);
  assert.equal('messages' in persistedRow, false);
  assert.equal(JSON.stringify(persistedRow).includes('Secret Host'), false);
  assert.equal(JSON.stringify(persistedRow).includes('Secret Viewer'), false);
  assert.equal(JSON.stringify(persistedRow).includes('Private message'), false);

  store.close();
});

test('PRIVACY GUARANTEE: no room discovery or enumeration API exists on RoomStore or repository', () => {
  const store = new RoomStore();
  assert.equal(typeof (store as unknown as Record<string, unknown>).listRooms, 'undefined');
  assert.equal(typeof (store as unknown as Record<string, unknown>).getAllRooms, 'undefined');
  assert.equal(typeof (store as unknown as Record<string, unknown>).searchRooms, 'undefined');
  assert.equal(typeof (store as unknown as Record<string, unknown>).getActiveRooms, 'undefined');
  store.close();
});

test('memory persistence is a deterministic no-op and Supabase mode fails without a client', async () => {
  const memoryRepository = new CowatchRoomsRepository(null, 900_000, 'memory');
  assert.equal(memoryRepository.validatePersistenceConfig().ok, true);
  assert.equal(await memoryRepository.touchActivity('ABC123'), true);
  assert.equal(await memoryRepository.updateSnapshot('ABC123', null, { playing: false, currentTime: 0, updatedAt: Date.now() }), true);

  const supabaseRepository = new CowatchRoomsRepository(null, 900_000, 'supabase');
  assert.equal(supabaseRepository.validatePersistenceConfig().ok, false);
  assert.equal(await supabaseRepository.touchActivity('ABC123'), false);
  assert.equal(await supabaseRepository.updateSnapshot('ABC123', null, { playing: false, currentTime: 0, updatedAt: Date.now() }), false);
  await assert.rejects(() => supabaseRepository.assertReady(), /SUPABASE_URL|Supabase client/i);
});

test('room state is not acknowledged locally when snapshot persistence fails', async () => {
  class FailingSnapshotRepository extends MockRoomsRepository {
    override async updateSnapshot(): Promise<boolean> {
      this.calls.updateSnapshot += 1;
      return false;
    }
  }

  const repository = new FailingSnapshotRepository();
  const store = new RoomStore(cowatchConfig.room, repository);
  const created = await store.createRoom('Host', 'socket-host', { type: 'movie', id: 550, providerId: 'embedmaster' });
  assert.equal('error' in created, false);
  if ('error' in created) return;

  assert.equal(await store.changeProvider(created.room.code, created.participant.id, 'poseidon'), false);
  assert.equal(created.room.media?.providerId, 'embedmaster');
  assert.equal(await store.setPlaying(created.room.code, created.participant.id, true), false);
  assert.equal(created.room.playback.playing, false);
  store.close();
});

test('generated share slug and room code exhaustion fail instead of colliding', async () => {
  class SlugsTakenRepository extends MockRoomsRepository {
    override async isLocatorPersisted(): Promise<boolean> {
      return true;
    }
  }

  class CodesTakenRepository extends MockRoomsRepository {
    override async isLocatorPersisted(): Promise<boolean> {
      return false;
    }
    override async isCodePersisted(): Promise<boolean> {
      return true;
    }
  }

  const slugStore = new RoomStore(cowatchConfig.room, new SlugsTakenRepository());
  assert.deepEqual(await slugStore.createRoom('Host', 'socket-host'), { error: 'SHARE_SLUG_GENERATION_FAILED' });
  slugStore.close();

  const codeStore = new RoomStore(cowatchConfig.room, new CodesTakenRepository());
  assert.deepEqual(await codeStore.createRoom('Host', 'socket-host'), { error: 'ROOM_CODE_GENERATION_FAILED' });
  codeStore.close();
});
