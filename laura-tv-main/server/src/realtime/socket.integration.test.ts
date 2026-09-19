import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import Fastify from 'fastify';
import { io as createClient, type Socket } from 'socket.io-client';
import { cowatchConfig } from './config.js';
import { registerCowatchRealtime } from './index.js';

type Result = { ok: boolean; error?: { code: string; message?: string }; room?: { code: string; shareSlug?: string | null; hostId: string; participants: unknown[]; maxParticipants: number; media?: { type: string; id: number }; playback?: { playing: boolean; currentTime: number; actionId?: string; sourceActionId?: string; actorId?: string }; callConfig?: { maxParticipants: number; iceServers: Array<{ urls: string | string[] }> } }; participantId?: string; reconnectToken?: string; reconnected?: boolean; hostId?: string; media?: unknown; playback?: { playing: boolean; currentTime: number; actionId?: string; sourceActionId?: string; actorId?: string }; message?: { text: string; senderId: string } };

const emitWithAck = (socket: Socket, event: string, payload: object) => new Promise<Result>((resolve) => {
  socket.emit(event, payload, resolve);
});

test('Socket.IO room flow creates, joins to capacity, rejects sixth, and transfers host', async () => {
  const app = Fastify();
  registerCowatchRealtime(app);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  const clients: Socket[] = [];

  try {
    for (let index = 0; index <= cowatchConfig.maxParticipants; index += 1) {
      const socket = createClient(url, { transports: ['websocket'], forceNew: true });
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
      });
      clients.push(socket);
    }

    const created = await emitWithAck(clients[0], 'room:create', { displayName: 'Host', initialMedia: { type: 'movie', id: 550, providerId: 'poseidon' } });
    assert.equal(created.ok, true);
    assert.equal(created.room?.maxParticipants, cowatchConfig.maxParticipants);
    assert.equal(created.room?.callConfig?.maxParticipants, cowatchConfig.maxParticipants);
    assert.ok(created.room?.callConfig?.iceServers.length);
    assert.deepEqual(created.room?.media, { type: 'movie', id: 550, providerId: 'poseidon' });
    const roomCode = created.room?.code;
    assert.ok(roomCode);

    for (const providerId of cowatchConfig.providers) {
      assert.equal((await emitWithAck(clients[0], 'media:change', { type: 'movie', id: 550, providerId })).ok, true);
    }
    assert.equal((await emitWithAck(clients[0], 'media:change', { type: 'movie', id: 550, providerId: 'unknown-provider' })).error?.code, 'INVALID_MEDIA');
    assert.equal((await emitWithAck(clients[0], 'media:change', { type: 'movie', id: 550, providerId: 'poseidon' })).ok, true);

    const participantIds: string[] = [created.participantId as string];
    const reconnectTokens: string[] = [created.reconnectToken as string];
    for (let index = 1; index < cowatchConfig.maxParticipants; index += 1) {
      const joined = await emitWithAck(clients[index], 'room:join', { roomCode, displayName: `Viewer ${index}` });
      assert.equal(joined.ok, true);
      participantIds.push(joined.participantId as string);
      reconnectTokens.push(joined.reconnectToken as string);
    }

    const overflow = await emitWithAck(clients[cowatchConfig.maxParticipants], 'room:join', { roomCode, displayName: 'Overflow' });
    assert.equal(overflow.ok, false);
    assert.equal(overflow.error?.code, 'ROOM_FULL');
    assert.equal((await emitWithAck(clients[cowatchConfig.maxParticipants], 'room:create', { displayName: 'x'.repeat(cowatchConfig.participant.maxNameLength + 1) })).error?.code, 'INVALID_NAME');

    const unauthorized = await emitWithAck(clients[1], 'room:transfer-host', { participantId: participantIds[2] });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.error?.code, 'HOST_ONLY');

    const transferred = await emitWithAck(clients[0], 'room:transfer-host', { participantId: participantIds[1] });
    assert.equal(transferred.ok, true);
    assert.equal(transferred.hostId, participantIds[1]);
    assert.equal((await emitWithAck(clients[0], 'provider:change', { providerId: 'zeus' })).error?.code, 'HOST_ONLY');

    const viewerMedia = await emitWithAck(clients[2], 'media:change', { type: 'movie', id: 550, providerId: 'poseidon' });
    assert.equal(viewerMedia.error?.code, 'HOST_ONLY');
    const hostMedia = await emitWithAck(clients[1], 'media:change', { type: 'tv', id: 1399, season: 2, episode: 3, providerId: 'poseidon' });
    assert.equal(hostMedia.ok, true);

    const viewerProvider = await emitWithAck(clients[2], 'provider:change', { providerId: 'zeus' });
    assert.equal(viewerProvider.error?.code, 'HOST_ONLY');
    const hostProvider = await emitWithAck(clients[1], 'provider:change', { providerId: 'zeus' });
    assert.equal(hostProvider.ok, true);

    const viewerPlay = await emitWithAck(clients[0], 'playback:play', { actionId: 'action-play-1' });
    assert.equal(viewerPlay.ok, true);
    const hostPlay = await emitWithAck(clients[1], 'playback:play', { actionId: 'action-play-2' });
    assert.equal(hostPlay.ok, true);

    const viewerPause = await emitWithAck(clients[0], 'playback:pause', { actionId: 'action-pause-1' });
    assert.equal(viewerPause.ok, true);
    const hostPause = await emitWithAck(clients[1], 'playback:pause', { actionId: 'action-pause-2' });
    assert.equal(hostPause.ok, true);

    const viewerSeek = await emitWithAck(clients[0], 'playback:seek', { currentTime: 120, actionId: 'action-seek-1' });
    assert.equal(viewerSeek.error?.code, 'HOST_ONLY');
    const hostSeek = await emitWithAck(clients[1], 'playback:seek', { currentTime: 120, actionId: 'action-seek-2' });
    assert.equal(hostSeek.ok, true);

    clients[1].emit('playback:timeline', { currentTime: 150, playing: true });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const syncReceived = new Promise<{ currentTime: number; playing: boolean }>((resolve) => {
      clients[0].once('playback:sync', resolve);
    });
    clients[1].emit('playback:timeline', { currentTime: 180, playing: true });
    const syncState = await syncReceived;
    assert.equal(syncState.currentTime, 180);
    assert.equal(syncState.playing, true);

    const chatReceived = new Promise<{ text: string; senderId: string }>((resolve) => {
      clients[0].once('chat:message', resolve);
    });
    const message = await emitWithAck(clients[2], 'chat:send', { text: 'Hello from viewer' });
    assert.equal(message.ok, true);
    assert.equal(message.message?.text, 'Hello from viewer');
    assert.deepEqual(await chatReceived, message.message);
    assert.equal((await emitWithAck(clients[2], 'chat:send', { text: 'x'.repeat(cowatchConfig.chat.maxMessageLength + 1) })).error?.code, 'INVALID_MESSAGE');

    const secondAppClient = createClient(url, { transports: ['websocket'], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      secondAppClient.once('connect', resolve);
      secondAppClient.once('connect_error', reject);
    });
    clients.push(secondAppClient);
    const secondRoom = await emitWithAck(secondAppClient, 'room:create', { displayName: 'Second Host' });
    assert.equal(secondRoom.ok, true);

    const offer = { type: 'offer', sdp: 'v=0\r\n' };
    const receivedOffer = new Promise<{ fromParticipantId: string; description: typeof offer }>((resolve) => clients[2].once('webrtc:offer', resolve));
    assert.equal((await emitWithAck(clients[1], 'webrtc:offer', { targetParticipantId: secondRoom.participantId as string, description: offer })).error?.code, 'INVALID_PARTICIPANT');
    assert.equal((await emitWithAck(clients[1], 'webrtc:offer', { targetParticipantId: participantIds[2], description: { type: 'bad', sdp: 'x' } })).error?.code, 'INVALID_SIGNAL');
    assert.equal((await emitWithAck(clients[1], 'webrtc:offer', { targetParticipantId: participantIds[2], description: offer })).ok, true);
    assert.deepEqual(await receivedOffer, { fromParticipantId: participantIds[1], description: offer });

    const answer = { type: 'answer', sdp: 'v=0\r\n' };
    const receivedAnswer = new Promise<{ fromParticipantId: string; description: typeof answer }>((resolve) => clients[1].once('webrtc:answer', resolve));
    assert.equal((await emitWithAck(clients[2], 'webrtc:answer', { targetParticipantId: participantIds[1], description: answer })).ok, true);
    assert.deepEqual(await receivedAnswer, { fromParticipantId: participantIds[2], description: answer });

    const candidate = { candidate: 'candidate:1 1 UDP 1 127.0.0.1 5000 typ host', sdpMid: '0', sdpMLineIndex: 0 };
    const receivedCandidate = new Promise<{ fromParticipantId: string; candidate: typeof candidate }>((resolve) => clients[3].once('webrtc:ice-candidate', resolve));
    assert.equal((await emitWithAck(clients[1], 'webrtc:ice-candidate', { targetParticipantId: participantIds[3], candidate })).ok, true);
    assert.deepEqual(await receivedCandidate, { fromParticipantId: participantIds[1], candidate });
    assert.equal((await emitWithAck(clients[1], 'webrtc:ice-candidate', { targetParticipantId: participantIds[3], candidate: { candidate: 42 } })).error?.code, 'INVALID_SIGNAL');
    const callStateNotice = new Promise<{ participantId: string; call: { microphoneEnabled: boolean; cameraEnabled: boolean } }>((resolve) => clients[0].once('call:participant-state', resolve));
    assert.equal((await emitWithAck(clients[3], 'call:state', { microphoneEnabled: false, cameraEnabled: false })).ok, true);
    assert.deepEqual(await callStateNotice, { participantId: participantIds[3], call: { joined: true, microphoneEnabled: false, cameraEnabled: false } });
    assert.equal((await emitWithAck(clients[3], 'room:leave', {})).ok, true);
    assert.equal((await emitWithAck(clients[3], 'call:state', { microphoneEnabled: true, cameraEnabled: true })).error?.code, 'NOT_A_MEMBER');
    assert.equal((await emitWithAck(clients[1], 'webrtc:offer', { targetParticipantId: participantIds[3], description: { type: 'offer', sdp: 'v=0\r\n' } })).error?.code, 'INVALID_PARTICIPANT');

    const kickedNotice = new Promise<{ reason: string }>((resolve) => clients[2].once('participant:kicked', resolve));
    assert.equal((await emitWithAck(clients[2], 'participant:kick', { participantId: participantIds[3] })).error?.code, 'HOST_ONLY');
    assert.equal((await emitWithAck(clients[1], 'participant:kick', { participantId: secondRoom.participantId as string })).error?.code, 'INVALID_PARTICIPANT');
    assert.equal((await emitWithAck(clients[1], 'participant:kick', { participantId: participantIds[2] })).ok, true);
    assert.match((await kickedNotice).reason, /removed/i);
    assert.equal((await emitWithAck(clients[2], 'playback:play', {})).error?.code, 'NOT_A_MEMBER');
    assert.equal((await emitWithAck(clients[2], 'room:join', { roomCode, displayName: 'Viewer 2' })).error?.code, 'KICKED');
  } finally {
    for (const client of clients) client.disconnect();
    await app.close();
  }
});

test('custom slug sharing, collision rejection, and canonical kick cooldown bypass prevention', async () => {
  const app = Fastify();
  registerCowatchRealtime(app);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  const clients = Array.from({ length: 4 }, () => createClient(url, { transports: ['websocket'], forceNew: true }));

  try {
    await Promise.all(clients.map((socket) => new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    })));

    // 1. Create room with custom slug
    const created = await emitWithAck(clients[0], 'room:create', { displayName: 'Host', customSlug: 'saras-personal-den' });
    assert.equal(created.ok, true);
    assert.equal(created.room?.shareSlug, 'saras-personal-den');
    const roomCode = created.room?.code as string;

    // 2. Another host attempting same custom slug gets neutral error message
    const collision = await emitWithAck(clients[1], 'room:create', { displayName: 'Other Host', customSlug: 'saras-personal-den' });
    assert.equal(collision.ok, false);
    assert.equal(collision.error?.code, 'SLUG_UNAVAILABLE');
    assert.equal(collision.error?.message, "That private room link isn't available.");

    // 3. Participant joins via custom slug
    const viewerJoin = await emitWithAck(clients[2], 'room:join', { roomCode: 'saras-personal-den', displayName: 'Viewer' });
    assert.equal(viewerJoin.ok, true);
    assert.equal(viewerJoin.room?.code, roomCode);

    // 4. Host kicks participant
    const kicked = await emitWithAck(clients[0], 'participant:kick', { participantId: viewerJoin.participantId as string });
    assert.equal(kicked.ok, true);

    // 5. Kicked participant tries to rejoin via canonical room code -> blocked by kick cooldown
    const rejoinByCode = await emitWithAck(clients[2], 'room:join', { roomCode, displayName: 'Viewer' });
    assert.equal(rejoinByCode.ok, false);
    assert.equal(rejoinByCode.error?.code, 'KICKED');

    // 6. Kicked participant tries to rejoin via share slug -> ALSO blocked by kick cooldown (no bypass)
    const rejoinBySlug = await emitWithAck(clients[2], 'room:join', { roomCode: 'saras-personal-den', displayName: 'Viewer' });
    assert.equal(rejoinBySlug.ok, false);
    assert.equal(rejoinBySlug.error?.code, 'KICKED');

  } finally {
    for (const client of clients) client.disconnect();
    await app.close();
  }
});

test('original creator and transferred host can kick while viewers and cross-room targets are rejected', async () => {
  const app = Fastify();
  registerCowatchRealtime(app);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  const clients = Array.from({ length: 4 }, () => createClient(url, { transports: ['websocket'], forceNew: true }));

  try {
    await Promise.all(clients.map((socket) => new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    })));
    const created = await emitWithAck(clients[0], 'room:create', { displayName: 'Creator' });
    const first = await emitWithAck(clients[1], 'room:join', { roomCode: created.room?.code, displayName: 'First viewer' });
    const second = await emitWithAck(clients[2], 'room:join', { roomCode: created.room?.code, displayName: 'Second viewer' });
    const other = await emitWithAck(clients[3], 'room:create', { displayName: 'Other room host' });
    assert.equal(created.ok && first.ok && second.ok && other.ok, true);

    assert.equal((await emitWithAck(clients[1], 'participant:kick', { participantId: second.participantId as string })).error?.code, 'HOST_ONLY');
    assert.equal((await emitWithAck(clients[0], 'participant:kick', { participantId: other.participantId as string })).error?.code, 'INVALID_PARTICIPANT');
    assert.equal((await emitWithAck(clients[0], 'participant:kick', { participantId: second.participantId as string })).ok, true);

    assert.equal((await emitWithAck(clients[0], 'room:transfer-host', { participantId: first.participantId as string })).ok, true);
    assert.equal((await emitWithAck(clients[0], 'participant:kick', { participantId: first.participantId as string })).error?.code, 'HOST_ONLY');
    assert.equal((await emitWithAck(clients[1], 'participant:kick', { participantId: other.participantId as string })).error?.code, 'INVALID_PARTICIPANT');
    assert.equal((await emitWithAck(clients[1], 'participant:kick', { participantId: created.participantId as string })).ok, true);
  } finally {
    for (const client of clients) client.disconnect();
    await app.close();
  }
});

test('explicit leave invalidates runtime membership allowing clean rejoin while accidental disconnect retains grace', async () => {
  const app = Fastify();
  registerCowatchRealtime(app);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  const clients = Array.from({ length: 3 }, () => createClient(url, { transports: ['websocket'], forceNew: true }));

  try {
    await Promise.all(clients.map((socket) => new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    })));

    // 1. Host creates room, viewer joins
    const created = await emitWithAck(clients[0], 'room:create', { displayName: 'Host' });
    assert.equal(created.ok, true);
    const roomCode = created.room?.code as string;

    const viewer = await emitWithAck(clients[1], 'room:join', { roomCode, displayName: 'Viewer' });
    assert.equal(viewer.ok, true);

    // 2. Viewer explicitly leaves room
    const left = await emitWithAck(clients[1], 'room:leave', {});
    assert.equal(left.ok, true);

    // 3. Viewer connects on new socket (or same) and rejoins immediately with normal join
    const rejoinClient = createClient(url, { transports: ['websocket'], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      rejoinClient.once('connect', resolve);
      rejoinClient.once('connect_error', reject);
    });
    clients.push(rejoinClient);

    const rejoined = await emitWithAck(rejoinClient, 'room:join', { roomCode, displayName: 'Viewer' });
    assert.equal(rejoined.ok, true);
    assert.equal(rejoined.reconnected, false);
    assert.ok(rejoined.participantId);

    // 4. Test accidental disconnect: Host disconnects socket without room:leave
    clients[0].disconnect();

    // Reconnecting host socket with reconnectToken restores session
    const reconnectHost = createClient(url, { transports: ['websocket'], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      reconnectHost.once('connect', resolve);
      reconnectHost.once('connect_error', reject);
    });
    clients.push(reconnectHost);

    const restored = await emitWithAck(reconnectHost, 'room:join', {
      roomCode,
      displayName: 'Host',
      reconnectToken: created.reconnectToken,
    });
    assert.equal(restored.ok, true);
    assert.equal(restored.reconnected, true);
    assert.equal(restored.participantId, created.participantId);

  } finally {
    for (const client of clients) client.disconnect();
    await app.close();
  }
});
