import type { RoomMedia, PlaybackState } from '../realtime/types.js';

export type CowatchRoomRecord = {
  id: string;
  room_code: string;
  share_slug: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  expires_at: string;
  media_type: string | null;
  tmdb_id: number | null;
  season_number: number | null;
  episode_number: number | null;
  provider_id: string | null;
  playback_playing: boolean;
  playback_position_seconds: number;
  playback_updated_at: string;
};

export type PersistedRoomSnapshot = {
  code: string;
  shareSlug: string | null;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  media: RoomMedia | null;
  playback: PlaybackState;
};

export interface ICowatchRoomsRepository {
  createRoom(
    code: string,
    shareSlug?: string | null,
    media?: RoomMedia | null,
    playback?: PlaybackState
  ): Promise<PersistedRoomSnapshot | null>;
  getRoomByExactCode(code: string): Promise<PersistedRoomSnapshot | null>;
  getRoomByLocator(locator: string): Promise<PersistedRoomSnapshot | null>;
  isCodePersisted(code: string): Promise<boolean>;
  isLocatorPersisted(locator: string): Promise<boolean>;
  updateSnapshot(code: string, media: RoomMedia | null, playback: PlaybackState): Promise<boolean>;
  touchActivity(code: string): Promise<boolean>;
  deleteExpiredRooms(): Promise<number>;
}
