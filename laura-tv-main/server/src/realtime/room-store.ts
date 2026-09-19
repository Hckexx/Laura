import { randomBytes, randomUUID } from 'node:crypto';
import { CowatchRoomsRepository } from '../database/rooms-repository.js';
import type { ICowatchRoomsRepository } from '../database/types.js';
import { cowatchConfig } from './config.js';
import { estimatePlayback } from './playback-clock.js';
import { generateRandomShareSlug, normalizeShareSlug } from './slug-utils.js';
import type { ChatMessage, Participant, PublicRoom, Room, RoomMedia } from './types.js';

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomStore {
  private readonly rooms = new Map<string, Room>();
  private readonly emptyRoomTimers = new Map<string, NodeJS.Timeout>();
  private readonly reconnectGraceTimers = new Map<string, NodeJS.Timeout>();
  private readonly heartbeatTimer?: NodeJS.Timeout;
  private readonly cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly roomTiming = cowatchConfig.room,
    private readonly repository: ICowatchRoomsRepository = new CowatchRoomsRepository(),
  ) {
    if (this.roomTiming.heartbeatIntervalMs > 0) {
      const timer = setInterval(() => void this.runHeartbeat(), this.roomTiming.heartbeatIntervalMs);
      timer.unref();
      this.heartbeatTimer = timer;
    }

    if (this.roomTiming.cleanupIntervalMs > 0) {
      // Run cleanup on startup and periodically
      void this.cleanupExpiredRooms();
      const timer = setInterval(() => void this.cleanupExpiredRooms(), this.roomTiming.cleanupIntervalMs);
      timer.unref();
      this.cleanupTimer = timer;
    }
  }

  async cleanupExpiredRooms(): Promise<number> {
    try {
      return await this.repository.deleteExpiredRooms();
    } catch {
      return 0;
    }
  }

  async createRoom(
    name: string,
    socketId: string,
    media: RoomMedia | null = null,
    customSlug?: string | null,
  ) {
    let shareSlug: string | null = null;
    if (customSlug && customSlug.trim()) {
      const normalized = normalizeShareSlug(customSlug);
      if (!normalized) {
        return { error: 'SLUG_UNAVAILABLE' as const };
      }
      const inMemoryTaken = [...this.rooms.values()].some((r) => r.shareSlug === normalized);
      if (inMemoryTaken) {
        return { error: 'SLUG_UNAVAILABLE' as const };
      }
      const persisted = await this.repository.isLocatorPersisted(normalized);
      if (persisted) {
        return { error: 'SLUG_UNAVAILABLE' as const };
      }
      shareSlug = normalized;
    } else {
      shareSlug = await this.generateCollisionSafeSlug();
      if (!shareSlug) return { error: 'SHARE_SLUG_GENERATION_FAILED' as const };
    }

    const code = await this.generateUniqueCode();
    if (!code) return { error: 'ROOM_CODE_GENERATION_FAILED' as const };
    const participant = this.createParticipant(name, socketId);
    const playback = { playing: false, currentTime: 0, updatedAt: Date.now() };

    const persisted = await this.repository.createRoom(code, shareSlug, media, playback);
    if (!persisted) {
      return { error: 'PERSISTENCE_FAILED' as const };
    }

    const room: Room = {
      code,
      shareSlug,
      createdAt: persisted.createdAt,
      hostId: participant.id,
      participants: new Map([[participant.id, participant]]),
      media,
      playback,
      messages: [],
    };
    this.rooms.set(code, room);
    return { room, participant };
  }

  getRoom(locator: string): Room | undefined {
    if (!locator) return undefined;
    const normalizedCode = this.normalizeCode(locator);
    const directMatch = this.rooms.get(normalizedCode);
    if (directMatch) return directMatch;

    const normalizedSlug = locator.trim().toLowerCase();
    for (const room of this.rooms.values()) {
      if (room.shareSlug === normalizedSlug) {
        return room;
      }
    }
    return undefined;
  }

  async resolveCanonicalCode(locator: string): Promise<string | null> {
    if (!locator) return null;
    const direct = this.getRoom(locator);
    if (direct) return direct.code;

    const snapshot = await this.repository.getRoomByLocator(locator);
    if (snapshot) return snapshot.code;

    return null;
  }

  async joinRoom(locator: string, name: string, socketId: string, reconnectToken?: string) {
    if (!locator) return { error: 'INVALID_ROOM' as const };

    let room = this.getRoom(locator);

    if (!room) {
      const snapshot = await this.repository.getRoomByLocator(locator);
      if (!snapshot) return { error: 'INVALID_ROOM' as const };

      let playback = snapshot.playback;
      if (playback.playing) {
        const elapsedSeconds = Math.max(0, (Date.now() - playback.updatedAt) / 1000);
        const currentTime = Math.min(playback.currentTime + elapsedSeconds, cowatchConfig.sync.maxTimelineSeconds);
        playback = { playing: true, currentTime, updatedAt: Date.now() };
      } else {
        playback = { ...playback, updatedAt: Date.now() };
      }

      room = {
        code: snapshot.code,
        shareSlug: snapshot.shareSlug,
        createdAt: snapshot.createdAt,
        hostId: '',
        participants: new Map(),
        media: snapshot.media,
        playback,
        messages: [],
      };
      this.rooms.set(room.code, room);
    }

    if (reconnectToken) {
      const existing = [...room.participants.values()].find(
        (participant) => participant.reconnectToken === reconnectToken,
      );
      if (existing) {
        existing.connected = true;
        existing.socketId = socketId;
        existing.call = { joined: true, microphoneEnabled: false, cameraEnabled: false };
        const hostChanged = this.ensureOccupiedRoomHasHost(room, existing);
        this.cancelReconnectGrace(room.code, existing.id);
        this.cancelEmptyExpiry(room.code);
        void this.repository.touchActivity(room.code).catch(() => {});
        return { room, participant: existing, reconnected: true, hostChanged };
      }
    }

    if (room.participants.size >= cowatchConfig.maxParticipants) {
      return { error: 'ROOM_FULL' as const };
    }

    const participant = this.createParticipant(name, socketId);
    room.participants.set(participant.id, participant);
    const hostChanged = this.ensureOccupiedRoomHasHost(room, participant);
    this.cancelEmptyExpiry(room.code);
    void this.repository.touchActivity(room.code).catch(() => {});
    return { room, participant, reconnected: false, hostChanged };
  }

  findMembership(socketId: string) {
    for (const room of this.rooms.values()) {
      for (const participant of room.participants.values()) {
        if (participant.socketId === socketId) return { room, participant };
      }
    }
    return undefined;
  }

  leaveBySocket(socketId: string, intentional: boolean, onFinalized: (room: Room, participant: Participant, hostChanged: boolean) => void) {
    const membership = this.findMembership(socketId);
    if (!membership) return undefined;
    const { room, participant } = membership;

    if (!intentional) {
      participant.connected = false;
      participant.socketId = undefined;
      participant.call = { joined: false, microphoneEnabled: false, cameraEnabled: false };
      this.startReconnectGrace(room, participant, onFinalized);
      return { room, participant, pendingGrace: true, hostChanged: false };
    }

    const hostChanged = this.removeParticipant(room, participant.id);
    onFinalized(room, participant, hostChanged);
    void this.repository.touchActivity(room.code).catch(() => {});
    return { room, participant, pendingGrace: false, hostChanged };
  }

  transferHost(roomCode: string, requesterId: string, newHostId: string) {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== requesterId) return false;
    const nextHost = room.participants.get(newHostId);
    if (!nextHost || !nextHost.connected || newHostId === requesterId) return false;
    room.hostId = newHostId;
    this.cancelReconnectGrace(room.code, requesterId);
    void this.repository.touchActivity(room.code).catch(() => {});
    return true;
  }

  removeRoom(roomCode: string) {
    const code = this.normalizeCode(roomCode);
    this.cancelEmptyExpiry(code);
    for (const [key, timer] of this.reconnectGraceTimers) {
      if (key.startsWith(`${code}:`)) {
        clearTimeout(timer);
        this.reconnectGraceTimers.delete(key);
      }
    }
    return this.rooms.delete(code);
  }

  hasParticipant(roomCode: string, participantId: string) {
    return this.getRoom(roomCode)?.participants.has(participantId) ?? false;
  }

  getHost(roomCode: string) {
    const room = this.getRoom(roomCode);
    return room?.participants.get(room.hostId);
  }

  async changeMedia(roomCode: string, requesterId: string, media: RoomMedia) {
    const room = this.getRoom(roomCode);
    if (!room || !room.participants.has(requesterId) || (room.hostId !== requesterId && !cowatchConfig.permissions.viewersCanChangeMedia)) return false;
    const playback = { playing: false, currentTime: 0, updatedAt: Date.now() };
    if (!await this.repository.updateSnapshot(room.code, media, playback)) return false;
    room.media = media;
    room.playback = playback;
    return true;
  }

  async changeProvider(roomCode: string, requesterId: string, providerId: RoomMedia['providerId']) {
    const room = this.getRoom(roomCode);
    if (!room || !room.participants.has(requesterId) || (room.hostId !== requesterId && !cowatchConfig.permissions.viewersCanChangeProvider) || !room.media) return false;
    const media = { ...room.media, providerId };
    const currentPlayback = estimatePlayback(room.playback);
    const playback = { playing: currentPlayback.playing, currentTime: currentPlayback.currentTime, updatedAt: Date.now() };
    if (!await this.repository.updateSnapshot(room.code, media, playback)) return false;
    room.media = media;
    room.playback = playback;
    return true;
  }

  async setPlaying(roomCode: string, requesterId: string, playing: boolean, sourceActionId?: string) {
    const room = this.getRoom(roomCode);
    if (!room || !room.participants.has(requesterId) || (room.hostId !== requesterId && !cowatchConfig.permissions.viewersCanPlayPause)) return false;
    const now = Date.now();
    const playback = { ...estimatePlayback(room.playback, now), playing, updatedAt: now, action: playing ? 'play' as const : 'pause' as const, actionId: randomUUID(), sourceActionId, actorId: requesterId };
    if (!await this.repository.updateSnapshot(room.code, room.media, playback)) return false;
    room.playback = playback;
    return true;
  }

  async seek(roomCode: string, requesterId: string, currentTime: number, sourceActionId?: string) {
    const room = this.getRoom(roomCode);
    if (!room || !room.participants.has(requesterId) || (room.hostId !== requesterId && !cowatchConfig.permissions.viewersCanSeek)) return false;
    const playback = { ...room.playback, currentTime, updatedAt: Date.now(), action: 'seek' as const, actionId: randomUUID(), sourceActionId, actorId: requesterId };
    if (!await this.repository.updateSnapshot(room.code, room.media, playback)) return false;
    room.playback = playback;
    return true;
  }

  updateHostTimeline(roomCode: string, requesterId: string, currentTime: number, playing: boolean) {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== requesterId || !room.participants.has(requesterId)) return false;
    room.playback = { playing, currentTime, updatedAt: Date.now() };
    return true;
  }

  kickParticipant(roomCode: string, requesterId: string, participantId: string) {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== requesterId || requesterId === participantId) return undefined;
    const participant = room.participants.get(participantId);
    if (!participant) return undefined;
    this.removeParticipant(room, participantId);
    void this.repository.touchActivity(room.code).catch(() => {});
    return participant;
  }

  addMessage(roomCode: string, participantId: string, text: string) {
    const room = this.getRoom(roomCode);
    const participant = room?.participants.get(participantId);
    if (!room || !participant) return undefined;
    const message: ChatMessage = {
      id: randomUUID(),
      senderId: participant.id,
      senderName: participant.name,
      text,
      timestamp: Date.now(),
    };
    room.messages.push(message);
    if (room.messages.length > cowatchConfig.chat.maxRecentMessages) {
      room.messages.splice(0, room.messages.length - cowatchConfig.chat.maxRecentMessages);
    }
    void this.repository.touchActivity(room.code).catch(() => {});
    return message;
  }

  updateCallState(roomCode: string, participantId: string, microphoneEnabled: boolean, cameraEnabled: boolean) {
    const participant = this.getRoom(roomCode)?.participants.get(participantId);
    if (!participant?.connected || !participant.call.joined) return false;
    participant.call = { joined: true, microphoneEnabled, cameraEnabled };
    return true;
  }

  getSignalingTarget(roomCode: string, senderId: string, targetId: string) {
    const room = this.getRoom(roomCode);
    const sender = room?.participants.get(senderId);
    const target = room?.participants.get(targetId);
    if (!room || !sender?.call.joined || !target?.call.joined || !target.connected || !target.socketId || senderId === targetId) return undefined;
    return target;
  }

  toPublicRoom(room: Room): PublicRoom {
    return {
      code: room.code,
      shareSlug: room.shareSlug ?? null,
      createdAt: room.createdAt,
      hostId: room.hostId,
      participants: [...room.participants.values()].map(({ socketId: _socketId, reconnectToken: _token, ...participant }) => participant),
      maxParticipants: cowatchConfig.maxParticipants,
      media: room.media,
      playback: estimatePlayback(room.playback),
      messages: [...room.messages],
      chatMaxMessageLength: cowatchConfig.chat.maxMessageLength,
      syncIntervalMs: cowatchConfig.sync.broadcastIntervalMs,
      driftToleranceSeconds: cowatchConfig.sync.driftToleranceSeconds,
      callConfig: {
        maxParticipants: cowatchConfig.maxParticipants,
        iceServers: cowatchConfig.video.iceServers.map((server) => ({ ...server, urls: Array.isArray(server.urls) ? [...server.urls] : server.urls })),
      },
    };
  }

  async runHeartbeat() {
    for (const room of this.rooms.values()) {
      const hasConnected = [...room.participants.values()].some((p) => p.connected);
      if (hasConnected) {
        if (room.playback.playing) {
          const currentPlayback = estimatePlayback(room.playback);
          await this.repository.updateSnapshot(room.code, room.media, currentPlayback).catch(() => {});
        } else {
          await this.repository.touchActivity(room.code).catch(() => {});
        }
      }
    }
  }

  close() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    for (const timer of this.emptyRoomTimers.values()) clearTimeout(timer);
    for (const timer of this.reconnectGraceTimers.values()) clearTimeout(timer);
    this.emptyRoomTimers.clear();
    this.reconnectGraceTimers.clear();
    this.rooms.clear();
  }

  private createParticipant(name: string, socketId: string): Participant {
    return {
      id: randomUUID(),
      name,
      joinedAt: Date.now(),
      connected: true,
      socketId,
      reconnectToken: randomBytes(32).toString('base64url'),
      call: { joined: true, microphoneEnabled: false, cameraEnabled: false },
    };
  }

  private ensureOccupiedRoomHasHost(room: Room, preferredParticipant?: Participant) {
    if (room.participants.size === 0 || room.participants.has(room.hostId)) return false;
    const nextHost = preferredParticipant ?? [...room.participants.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    room.hostId = nextHost.id;
    return true;
  }

  private removeParticipant(room: Room, participantId: string) {
    const wasHost = room.hostId === participantId;
    room.participants.delete(participantId);
    this.cancelReconnectGrace(room.code, participantId);
    let hostChanged = false;

    if (wasHost && room.participants.size > 0) {
      const oldestConnected = [...room.participants.values()]
        .filter((participant) => participant.connected)
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      const oldest = oldestConnected ?? [...room.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = oldest.id;
      hostChanged = true;
    }

    if (room.participants.size === 0) this.scheduleEmptyExpiry(room.code);
    return hostChanged;
  }

  private startReconnectGrace(room: Room, participant: Participant, onFinalized: (room: Room, participant: Participant, hostChanged: boolean) => void) {
    this.cancelReconnectGrace(room.code, participant.id);
    const key = `${room.code}:${participant.id}`;
    const timer = setTimeout(() => {
      this.reconnectGraceTimers.delete(key);
      const currentRoom = this.rooms.get(room.code);
      const currentParticipant = currentRoom?.participants.get(participant.id);
      if (!currentRoom || !currentParticipant || currentParticipant.connected) return;
      const hostChanged = this.removeParticipant(currentRoom, participant.id);
      onFinalized(currentRoom, participant, hostChanged);
    }, this.roomTiming.hostReconnectGraceMs);
    timer.unref();
    this.reconnectGraceTimers.set(key, timer);
  }

  private scheduleEmptyExpiry(roomCode: string) {
    this.cancelEmptyExpiry(roomCode);
    const timer = setTimeout(() => this.removeRoom(roomCode), this.roomTiming.emptyRoomExpiryMs);
    timer.unref();
    this.emptyRoomTimers.set(roomCode, timer);
  }

  private cancelEmptyExpiry(roomCode: string) {
    const timer = this.emptyRoomTimers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.emptyRoomTimers.delete(roomCode);
  }

  private cancelReconnectGrace(roomCode: string, participantId: string) {
    const key = `${roomCode}:${participantId}`;
    const timer = this.reconnectGraceTimers.get(key);
    if (timer) clearTimeout(timer);
    this.reconnectGraceTimers.delete(key);
  }

  private normalizeCode(roomCode: string) {
    return roomCode.trim().toUpperCase();
  }

  private async generateUniqueCode(): Promise<string | null> {
    for (let attempts = 0; attempts < 20; attempts += 1) {
      const bytes = randomBytes(cowatchConfig.room.codeLength);
      const code = [...bytes]
        .map((byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length])
        .join('');
      if (!this.rooms.has(code)) {
        const persisted = await this.repository.isCodePersisted(code);
        if (!persisted) return code;
      }
    }
    return null;
  }

  private async generateCollisionSafeSlug(): Promise<string | null> {
    let attempts = 0;
    while (attempts < 20) {
      attempts++;
      const slug = generateRandomShareSlug();
      const inMemoryTaken = [...this.rooms.values()].some((r) => r.shareSlug === slug);
      if (!inMemoryTaken) {
        const persisted = await this.repository.isLocatorPersisted(slug);
        if (!persisted) {
          return slug;
        }
      }
    }
    return null;
  }
}
