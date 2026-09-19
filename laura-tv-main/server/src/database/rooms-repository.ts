import type { SupabaseClient } from '@supabase/supabase-js';

import { cowatchConfig } from '../realtime/config.js';
import type {
  PlaybackState,
  RoomMedia,
} from '../realtime/types.js';

import { getSupabaseClient } from './supabase.js';

import type {
  CowatchRoomRecord,
  ICowatchRoomsRepository,
  PersistedRoomSnapshot,
} from './types.js';

export class CowatchRoomsRepository
  implements ICowatchRoomsRepository
{
  private client: SupabaseClient | null;

  private readonly inactivityMs: number;

  private readonly persistenceMode:
    | 'memory'
    | 'supabase';

  constructor(
    customClient?: SupabaseClient | null,
    customInactivityMs?: number,
    persistenceMode:
      | 'memory'
      | 'supabase' = cowatchConfig.persistenceMode,
  ) {
    this.persistenceMode = persistenceMode;

    this.client =
      customClient !== undefined
        ? customClient
        : this.persistenceMode === 'supabase'
          ? getSupabaseClient()
          : null;

    this.inactivityMs =
      customInactivityMs ??
      cowatchConfig.room.inactivityExpiryMs;
  }

  private get activeClient(): SupabaseClient | null {
    if (this.client) {
      return this.client;
    }

    if (this.persistenceMode === 'memory') {
      return null;
    }

    this.client = getSupabaseClient();

    return this.client;
  }

  validatePersistenceConfig(): {
    ok: boolean;
    message?: string;
  } {
    if (this.persistenceMode !== 'supabase') {
      return {
        ok: true,
        message: 'Running in explicit in-memory mode.',
      };
    }

    const url =
      process.env.SUPABASE_URL?.trim();

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !serviceKey) {
      const message =
        'Cowatch persistence mode is set to "supabase" but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.';

      console.error(
        `[Cowatch Persistence Error] ${message}`,
      );

      return {
        ok: false,
        message,
      };
    }

    return {
      ok: true,
    };
  }

  async assertReady(): Promise<void> {
    const validation =
      this.validatePersistenceConfig();

    if (!validation.ok) {
      throw new Error(validation.message);
    }

    if (this.persistenceMode === 'memory') {
      return;
    }

    const client = this.activeClient;

    if (!client) {
      throw new Error(
        'Supabase persistence is configured but the Supabase client is unavailable.',
      );
    }

    /*
     * Validate the actual schema Cowatch requires,
     * not merely the presence of `id`.
     *
     * This catches stale databases such as the earlier
     * missing share_slug migration before the server starts.
     */
    const { error } = await client
      .from('cowatch_rooms')
      .select(
        [
          'id',
          'room_code',
          'share_slug',
          'expires_at',
          'media_type',
          'tmdb_id',
          'season_number',
          'episode_number',
          'provider_id',
          'playback_playing',
          'playback_position_seconds',
          'playback_updated_at',
        ].join(','),
      )
      .limit(1);

    if (error) {
      throw new Error(
        `Supabase persistence readiness failed: ${this.sanitizeErrorMessage(error)}`,
      );
    }
  }

  private sanitizeErrorMessage(
    error: unknown,
  ): string {
    let message =
      'Database operation failed';

    if (!error) {
      return 'Unknown database error';
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message ===
        'string'
    ) {
      const value =
        error as {
          message: string;
          code?: unknown;
          details?: unknown;
        };

      message = value.message;

      if (value.code) {
        message = `[${String(value.code)}] ${message}`;
      }

      if (typeof value.details === 'string') {
        message += ` - ${value.details}`;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    for (const secret of [
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.TMDB_API_TOKEN,
    ]) {
      if (secret?.trim()) {
        message = message.replaceAll(
          secret.trim(),
          '[REDACTED_SECRET]',
        );
      }
    }

    return message
      .replace(
        /sb_secret_[A-Za-z0-9_-]+/g,
        '[REDACTED_SUPABASE_SECRET]',
      )
      .replace(
        /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/g,
        '[REDACTED_JWT]',
      );
  }

  private normalizeLocator(
    locator: string,
  ):
    | {
        kind: 'code' | 'slug';
        value: string;
      }
    | null {
    const raw = locator.trim();

    if (
      !raw ||
      raw.length > 48
    ) {
      return null;
    }

    const normalizedCode =
      raw.toUpperCase();

    const roomCodePattern =
      new RegExp(
        `^[A-HJ-NP-Z2-9]{${cowatchConfig.room.codeLength}}$`,
      );

    if (
      roomCodePattern.test(normalizedCode)
    ) {
      return {
        kind: 'code',
        value: normalizedCode,
      };
    }

    const normalizedSlug =
      raw.toLowerCase();

    if (
      normalizedSlug.length < 3 ||
      normalizedSlug.length > 48
    ) {
      return null;
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        normalizedSlug,
      )
    ) {
      return null;
    }

    return {
      kind: 'slug',
      value: normalizedSlug,
    };
  }

  private recordToSnapshot(
    record: CowatchRoomRecord,
  ): PersistedRoomSnapshot {
    const createdAt =
      new Date(
        record.created_at,
      ).getTime();

    const lastActivityAt =
      new Date(
        record.last_activity_at,
      ).getTime();

    const expiresAt =
      new Date(
        record.expires_at,
      ).getTime();

    const playbackUpdatedAt =
      new Date(
        record.playback_updated_at,
      ).getTime();

    const isTv =
      record.media_type === 'tv';

    const hasSeason =
      record.season_number !== null &&
      record.season_number !== undefined;

    const hasEpisode =
      record.episode_number !== null &&
      record.episode_number !== undefined;

    const media: RoomMedia | null =
      record.media_type &&
      record.tmdb_id &&
      record.provider_id
        ? {
            type:
              record.media_type as
                | 'movie'
                | 'tv',

            id: Number(
              record.tmdb_id,
            ),

            ...(isTv &&
            hasSeason &&
            hasEpisode
              ? {
                  season: Number(
                    record.season_number,
                  ),

                  episode: Number(
                    record.episode_number,
                  ),
                }
              : {}),

            providerId:
              record.provider_id as RoomMedia['providerId'],
          }
        : null;

    const playback: PlaybackState = {
      playing:
        record.playback_playing,

      currentTime:
        record.playback_position_seconds,

      updatedAt:
        Number.isFinite(
          playbackUpdatedAt,
        )
          ? playbackUpdatedAt
          : Date.now(),
    };

    return {
      code:
        record.room_code,

      shareSlug:
        record.share_slug,

      createdAt:
        Number.isFinite(createdAt)
          ? createdAt
          : Date.now(),

      lastActivityAt:
        Number.isFinite(lastActivityAt)
          ? lastActivityAt
          : Date.now(),

      expiresAt:
        Number.isFinite(expiresAt)
          ? expiresAt
          : Date.now() +
            this.inactivityMs,

      media,
      playback,
    };
  }

  async createRoom(
    code: string,
    shareSlug?: string | null,
    media: RoomMedia | null = null,
    playback: PlaybackState = {
      playing: false,
      currentTime: 0,
      updatedAt: Date.now(),
    },
  ): Promise<PersistedRoomSnapshot | null> {
    const client =
      this.activeClient;

    const normalizedCode =
      code.trim().toUpperCase();

    const normalizedSlug =
      shareSlug
        ? shareSlug
            .trim()
            .toLowerCase()
        : null;

    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          this.inactivityMs,
      );

    if (!client) {
      if (
        this.persistenceMode ===
        'supabase'
      ) {
        console.error(
          '[Cowatch Persistence Error] Cowatch persistence mode is "supabase" but Supabase client is unavailable.',
        );

        return null;
      }

      return {
        code:
          normalizedCode,

        shareSlug:
          normalizedSlug,

        createdAt:
          now.getTime(),

        lastActivityAt:
          now.getTime(),

        expiresAt:
          expiresAt.getTime(),

        media,
        playback,
      };
    }

    const row = {
      room_code:
        normalizedCode,

      share_slug:
        normalizedSlug,

      created_at:
        now.toISOString(),

      updated_at:
        now.toISOString(),

      last_activity_at:
        now.toISOString(),

      expires_at:
        expiresAt.toISOString(),

      media_type:
        media?.type ?? null,

      tmdb_id:
        media?.id ?? null,

      season_number:
        media?.season ?? null,

      episode_number:
        media?.episode ?? null,

      provider_id:
        media?.providerId ?? null,

      playback_playing:
        playback.playing,

      playback_position_seconds:
        playback.currentTime,

      playback_updated_at:
        new Date(
          playback.updatedAt,
        ).toISOString(),
    };

    try {
      const {
        data,
        error,
      } = await client
        .from('cowatch_rooms')
        .insert(row)
        .select()
        .single();

      if (
        error ||
        !data
      ) {
        console.error(
          `[Cowatch Persistence Error] Room creation insert failed for code "${normalizedCode}": ${this.sanitizeErrorMessage(error)}`,
        );

        return null;
      }

      return this.recordToSnapshot(
        data as CowatchRoomRecord,
      );
    } catch (error) {
      console.error(
        `[Cowatch Persistence Error] Exception during room creation for code "${normalizedCode}": ${this.sanitizeErrorMessage(error)}`,
      );

      return null;
    }
  }

  async getRoomByExactCode(
    code: string,
  ): Promise<PersistedRoomSnapshot | null> {
    const client =
      this.activeClient;

    if (!client) {
      return null;
    }

    const normalizedCode =
      code.trim().toUpperCase();

    const nowIso =
      new Date().toISOString();

    try {
      const {
        data,
        error,
      } = await client
        .from('cowatch_rooms')
        .select('*')
        .eq(
          'room_code',
          normalizedCode,
        )
        .gt(
          'expires_at',
          nowIso,
        )
        .maybeSingle();

      if (
        error ||
        !data
      ) {
        return null;
      }

      return this.recordToSnapshot(
        data as CowatchRoomRecord,
      );
    } catch {
      return null;
    }
  }

  async getRoomByLocator(
    locator: string,
  ): Promise<PersistedRoomSnapshot | null> {
    const client =
      this.activeClient;

    if (!client) {
      return null;
    }

    const normalized =
      this.normalizeLocator(locator);

    if (!normalized) {
      return null;
    }

    const nowIso =
      new Date().toISOString();

    try {
      /*
       * Deliberately use an exact .eq query rather
       * than injecting the raw locator into .or(...)
       * PostgREST syntax.
       */
      const query =
        client
          .from('cowatch_rooms')
          .select('*')
          .eq(
            normalized.kind ===
              'code'
              ? 'room_code'
              : 'share_slug',

            normalized.value,
          )
          .gt(
            'expires_at',
            nowIso,
          );

      const {
        data,
        error,
      } = await query.maybeSingle();

      if (
        error ||
        !data
      ) {
        return null;
      }

      return this.recordToSnapshot(
        data as CowatchRoomRecord,
      );
    } catch {
      return null;
    }
  }

  async isCodePersisted(
    code: string,
  ): Promise<boolean> {
    return this.isLocatorPersisted(
      code,
    );
  }

  async isLocatorPersisted(
    locator: string,
  ): Promise<boolean> {
    const client =
      this.activeClient;

    if (!client) {
      return false;
    }

    const normalized =
      this.normalizeLocator(locator);

    if (!normalized) {
      return false;
    }

    const nowIso =
      new Date().toISOString();

    try {
      const query =
        client
          .from('cowatch_rooms')
          .select('id')
          .eq(
            normalized.kind ===
              'code'
              ? 'room_code'
              : 'share_slug',

            normalized.value,
          )
          .gt(
            'expires_at',
            nowIso,
          );

      const {
        data,
        error,
      } = await query.maybeSingle();

      return (
        !error &&
        Boolean(data)
      );
    } catch {
      return false;
    }
  }

  async updateSnapshot(
    code: string,
    media: RoomMedia | null,
    playback: PlaybackState,
  ): Promise<boolean> {
    const client =
      this.activeClient;

    if (!client) {
      return (
        this.persistenceMode ===
        'memory'
      );
    }

    const normalizedCode =
      code.trim().toUpperCase();

    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          this.inactivityMs,
      );

    try {
      const {
        error,
      } = await client
        .from('cowatch_rooms')
        .update({
          media_type:
            media?.type ?? null,

          tmdb_id:
            media?.id ?? null,

          season_number:
            media?.season ?? null,

          episode_number:
            media?.episode ?? null,

          provider_id:
            media?.providerId ?? null,

          playback_playing:
            playback.playing,

          playback_position_seconds:
            playback.currentTime,

          playback_updated_at:
            new Date(
              playback.updatedAt,
            ).toISOString(),

          last_activity_at:
            now.toISOString(),

          expires_at:
            expiresAt.toISOString(),

          updated_at:
            now.toISOString(),
        })
        .eq(
          'room_code',
          normalizedCode,
        );

      if (error) {
        console.error(
          `[Cowatch Persistence Error] updateSnapshot failed for "${normalizedCode}": ${this.sanitizeErrorMessage(error)}`,
        );
      }

      return !error;
    } catch (error) {
      console.error(
        `[Cowatch Persistence Error] updateSnapshot exception for "${normalizedCode}": ${this.sanitizeErrorMessage(error)}`,
      );

      return false;
    }
  }

  async touchActivity(
    code: string,
  ): Promise<boolean> {
    const client =
      this.activeClient;

    if (!client) {
      return (
        this.persistenceMode ===
        'memory'
      );
    }

    const normalizedCode =
      code.trim().toUpperCase();

    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          this.inactivityMs,
      );

    try {
      const {
        error,
      } = await client
        .from('cowatch_rooms')
        .update({
          last_activity_at:
            now.toISOString(),

          expires_at:
            expiresAt.toISOString(),

          updated_at:
            now.toISOString(),
        })
        .eq(
          'room_code',
          normalizedCode,
        );

      return !error;
    } catch {
      return false;
    }
  }

  async deleteExpiredRooms(): Promise<number> {
    const client =
      this.activeClient;

    if (!client) {
      return 0;
    }

    const nowIso =
      new Date().toISOString();

    try {
      const {
        data,
        error,
      } = await client
        .from('cowatch_rooms')
        .delete()
        .lte(
          'expires_at',
          nowIso,
        )
        .select('id');

      if (
        error ||
        !data
      ) {
        return 0;
      }

      return data.length;
    } catch {
      return 0;
    }
  }
}