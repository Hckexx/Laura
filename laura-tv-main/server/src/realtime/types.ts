export type CallState = {
  joined: boolean;
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
};

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type Participant = {
  id: string;
  name: string;
  joinedAt: number;
  connected: boolean;
  socketId?: string;
  reconnectToken: string;
  call: CallState;
};

export type RoomMedia = {
  type: 'movie' | 'tv';
  id: number;
  season?: number;
  episode?: number;
  providerId: 'poseidon' | 'zeus' | 'hades' | 'erebus' | 'vidzee' | 'embedmaster' | 'vidlink';
};

export type PlaybackState = {
  playing: boolean;
  currentTime: number;
  updatedAt: number;
  action?: 'play' | 'pause' | 'seek';
  actionId?: string;
  sourceActionId?: string;
  actorId?: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
};

export type Room = {
  code: string;
  shareSlug?: string | null;
  createdAt: number;
  hostId: string;
  participants: Map<string, Participant>;
  media: RoomMedia | null;
  playback: PlaybackState;
  messages: ChatMessage[];
};

export type PublicParticipant = Omit<Participant, 'socketId' | 'reconnectToken'>;

export type PublicRoom = {
  code: string;
  shareSlug?: string | null;
  createdAt: number;
  hostId: string;
  participants: PublicParticipant[];
  maxParticipants: number;
  media: RoomMedia | null;
  playback: PlaybackState;
  messages: ChatMessage[];
  chatMaxMessageLength: number;
  syncIntervalMs: number;
  driftToleranceSeconds: number;
  callConfig: {
    maxParticipants: number;
    iceServers: IceServerConfig[];
  };
};

export type RoomErrorCode =
  | 'INVALID_PAYLOAD'
  | 'INVALID_NAME'
  | 'INVALID_ROOM'
  | 'SLUG_UNAVAILABLE'
  | 'PERSISTENCE_FAILED'
  | 'ROOM_CODE_GENERATION_FAILED'
  | 'SHARE_SLUG_GENERATION_FAILED'
  | 'ROOM_FULL'
  | 'NOT_A_MEMBER'
  | 'HOST_ONLY'
  | 'INVALID_PARTICIPANT'
  | 'INVALID_MEDIA'
  | 'INVALID_PROVIDER'
  | 'INVALID_PLAYBACK'
  | 'INVALID_MESSAGE'
  | 'CHAT_RATE_LIMITED'
  | 'KICKED'
  | 'INVALID_SIGNAL'
  | 'RATE_LIMITED'
  | 'TEMPORARILY_BLOCKED';

export type EventResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true } & T)
  | { ok: false; error: { code: RoomErrorCode; message: string } };
