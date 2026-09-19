import assert from 'node:assert/strict';
import test from 'node:test';
import { cowatchConfig } from './config.js';
import { RoomStore } from './room-store.js';

test('creates a room with a secure host identity and public state', async () => {
  const store = new RoomStore();
  const created = await store.createRoom('Host', 'socket-host');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const { room, participant } = created;
  const publicRoom = store.toPublicRoom(room);

  assert.equal(room.hostId, participant.id);
  assert.equal(room.code.length, cowatchConfig.room.codeLength);
  assert.equal(publicRoom.maxParticipants, cowatchConfig.maxParticipants);
  assert.equal(publicRoom.participants[0].name, 'Host');
  assert.equal('reconnectToken' in publicRoom.participants[0], false);
  store.close();
});

test('handles custom slugs and rejects unavailable / collision custom slugs with SLUG_UNAVAILABLE', async () => {
  const store = new RoomStore();
  const first = await store.createRoom('Host 1', 'socket-1', null, 'saras-personal-den');
  assert.equal('error' in first, false);
  if ('error' in first) return;
  assert.equal(first.room.shareSlug, 'saras-personal-den');

  // Attempting to create another room with the same custom slug must fail with SLUG_UNAVAILABLE (no silent override)
  const duplicate = await store.createRoom('Host 2', 'socket-2', null, 'saras-personal-den');
  assert.deepEqual(duplicate, { error: 'SLUG_UNAVAILABLE' });

  // Reserved slug must be rejected
  const reserved = await store.createRoom('Host 3', 'socket-3', null, 'movies');
  assert.deepEqual(reserved, { error: 'SLUG_UNAVAILABLE' });

  // Resolving canonical code
  const resolvedCode = await store.resolveCanonicalCode('saras-personal-den');
  assert.equal(resolvedCode, first.room.code);

  store.close();
});

test('supports Season 0 TV media creation and restore', async () => {
  const store = new RoomStore();
  const media = { type: 'tv' as const, id: 1399, season: 0, episode: 1, providerId: 'embedmaster' as const };
  const created = await store.createRoom('Host', 'socket-tv', media);
  assert.equal('error' in created, false);
  if ('error' in created) return;

  assert.deepEqual(created.room.media, media);
  const publicRoom = store.toPublicRoom(created.room);
  assert.deepEqual(publicRoom.media, media);
  store.close();
});

test('enforces configured capacity and permits token reconnect without duplication', async () => {
  const store = new RoomStore();
  const created = await store.createRoom('Host', 'socket-0');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const { room, participant: host } = created;

  for (let index = 1; index < cowatchConfig.maxParticipants; index += 1) {
    const joined = await store.joinRoom(room.code, `Viewer ${index}`, `socket-${index}`);
    assert.equal('error' in joined, false);
  }

  assert.deepEqual(await store.joinRoom(room.code, 'Sixth', 'socket-overflow'), { error: 'ROOM_FULL' });
  let finalized = false;
  store.leaveBySocket('socket-0', false, () => { finalized = true; });
  const rejoined = await store.joinRoom(room.code.toLowerCase(), 'Host', 'socket-reconnected', host.reconnectToken);
  assert.equal('error' in rejoined, false);
  if (!('error' in rejoined)) {
    assert.equal(rejoined.reconnected, true);
    assert.equal(rejoined.room.participants.size, cowatchConfig.maxParticipants);
  }
  assert.equal(finalized, false);
  store.close();
});

test('validates host transfer and selects the oldest remaining participant on host leave', async () => {
  const store = new RoomStore();
  const created = await store.createRoom('Host', 'socket-host');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const { room, participant: host } = created;

  const first = await store.joinRoom(room.code, 'First', 'socket-first');
  const second = await store.joinRoom(room.code, 'Second', 'socket-second');
  assert.equal('error' in first, false);
  assert.equal('error' in second, false);
  if ('error' in first || 'error' in second) return;

  assert.equal(store.transferHost(room.code, second.participant.id, first.participant.id), false);
  assert.equal(store.transferHost(room.code, host.id, second.participant.id), true);
  assert.equal(room.hostId, second.participant.id);
  store.leaveBySocket('socket-second', true, () => undefined);
  assert.equal(room.hostId, host.id);
  store.leaveBySocket('socket-host', true, () => undefined);
  assert.equal(room.hostId, first.participant.id);
  store.close();
});

test('transfers after host grace and expires the room after it becomes empty', async () => {
  const store = new RoomStore({
    ...cowatchConfig.room,
    hostReconnectGraceMs: 10,
    emptyRoomExpiryMs: 10,
  });
  const created = await store.createRoom('Host', 'socket-host');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const { room } = created;

  const first = await store.joinRoom(room.code, 'First', 'socket-first');
  assert.equal('error' in first, false);
  if ('error' in first) return;

  store.leaveBySocket('socket-host', false, () => undefined);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(room.hostId, first.participant.id);

  store.leaveBySocket('socket-first', true, () => undefined);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(store.getRoom(room.code), undefined);
  store.close();
});

test('allows participant play/pause while keeping media, provider, and seek host-only', async () => {
  const store = new RoomStore();
  const created = await store.createRoom('Host', 'socket-host');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const { room, participant: host } = created;

  const viewer = await store.joinRoom(room.code, 'Viewer', 'socket-viewer');
  assert.equal('error' in viewer, false);
  if ('error' in viewer) return;

  assert.equal(await store.changeMedia(room.code, viewer.participant.id, { type: 'movie', id: 100, providerId: 'vidlink' }), false);
  assert.equal(await store.changeMedia(room.code, host.id, { type: 'movie', id: 100, providerId: 'vidlink' }), true);
  assert.equal(room.media?.id, 100);

  assert.equal(await store.changeProvider(room.code, viewer.participant.id, 'poseidon'), false);
  assert.equal(await store.changeProvider(room.code, host.id, 'poseidon'), true);
  assert.equal(room.media?.providerId, 'poseidon');

  assert.equal(await store.seek(room.code, viewer.participant.id, 45), false);
  assert.equal(await store.seek(room.code, host.id, 45, 'seek-action'), true);
  assert.equal(room.playback.currentTime, 45);
  assert.equal(room.playback.sourceActionId, 'seek-action');

  assert.equal(await store.setPlaying(room.code, viewer.participant.id, true, 'viewer-play-action'), true);
  assert.equal(room.playback.actorId, viewer.participant.id);
  assert.equal(await store.setPlaying(room.code, host.id, true, 'play-action'), true);
  assert.equal(room.playback.playing, true);
  assert.equal(store.updateHostTimeline(room.code, host.id, 60, true), true);
  assert.equal(room.playback.currentTime, 60);

  const message = store.addMessage(room.code, viewer.participant.id, 'Hello LauraTV');
  assert.equal(message?.text, 'Hello LauraTV');
  assert.equal(room.messages.length, 1);
  store.close();
});

test('allows only host to kick and validates target membership', async () => {
  const store = new RoomStore();
  const created = await store.createRoom('Host', 'socket-host');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const { room, participant: host } = created;

  const viewer = await store.joinRoom(room.code, 'Viewer', 'socket-viewer');
  const otherCreated = await store.createRoom('Other Host', 'socket-other');
  assert.equal('error' in viewer, false);
  assert.equal('error' in otherCreated, false);
  if ('error' in viewer || 'error' in otherCreated) return;

  assert.equal(store.kickParticipant(room.code, viewer.participant.id, host.id), undefined);
  assert.equal(store.kickParticipant(room.code, host.id, host.id), undefined);
  assert.equal(store.kickParticipant(room.code, host.id, otherCreated.participant.id), undefined);
  assert.equal(store.kickParticipant(room.code, host.id, viewer.participant.id)?.id, viewer.participant.id);
  assert.equal(room.participants.has(viewer.participant.id), false);
  store.close();
});

test('keeps a disconnected viewer during grace and reconnects without duplication', async () => {
  const store = new RoomStore();
  const created = await store.createRoom('Host', 'socket-host');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const { room } = created;

  const viewer = await store.joinRoom(room.code, 'Viewer', 'socket-viewer');
  assert.equal('error' in viewer, false);
  if ('error' in viewer) return;

  store.leaveBySocket('socket-viewer', false, () => undefined);
  assert.equal(room.participants.get(viewer.participant.id)?.connected, false);
  const rejoined = await store.joinRoom(room.code, 'Viewer', 'socket-viewer-new', viewer.participant.reconnectToken);
  assert.equal('error' in rejoined, false);
  if ('error' in rejoined) return;
  assert.equal(rejoined.reconnected, true);
  assert.equal(rejoined.participant.id, viewer.participant.id);
  assert.equal(room.participants.size, 2);
  store.close();
});

test('makes every connected room participant receive-ready and clears media presence on disconnect', async () => {
  const store = new RoomStore(cowatchConfig.room);
  const created = await store.createRoom('Host', 'socket-host');
  assert.equal('error' in created, false);
  if ('error' in created) return;
  const { room, participant: host } = created;

  const first = await store.joinRoom(room.code, 'First', 'socket-first');
  const second = await store.joinRoom(room.code, 'Second', 'socket-second');
  assert.equal('error' in first, false);
  assert.equal('error' in second, false);
  if ('error' in first || 'error' in second) return;

  assert.equal(host.call.joined, true);
  assert.equal(first.participant.call.joined, true);
  assert.equal(second.participant.call.joined, true);
  assert.equal(store.updateCallState(room.code, first.participant.id, false, true), true);
  assert.deepEqual(first.participant.call, { joined: true, microphoneEnabled: false, cameraEnabled: true });
  assert.equal(store.getSignalingTarget(room.code, host.id, first.participant.id)?.id, first.participant.id);

  store.leaveBySocket('socket-first', false, () => undefined);
  assert.deepEqual(first.participant.call, { joined: false, microphoneEnabled: false, cameraEnabled: false });
  assert.equal(store.getSignalingTarget(room.code, host.id, first.participant.id), undefined);
  const rejoined = await store.joinRoom(room.code, 'First', 'socket-first-new', first.participant.reconnectToken);
  assert.equal('error' in rejoined, false);
  assert.deepEqual(first.participant.call, { joined: true, microphoneEnabled: false, cameraEnabled: false });
  store.close();
});
