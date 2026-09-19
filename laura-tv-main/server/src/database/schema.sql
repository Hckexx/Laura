-- ==============================================================================
-- LauraTV: Cowatch Private Rooms Schema
--
-- Privacy Guarantees:
-- 1. Only room metadata and playback snapshot are stored.
-- 2. Chat messages and participant identities/tokens/WebRTC state are NEVER persisted.
-- 3. Row Level Security (RLS) is enabled with no public/anon policies.
--    Only the server-side service role key can access this table.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS cowatch_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  share_slug TEXT UNIQUE NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  media_type TEXT NULL,
  tmdb_id BIGINT NULL,
  season_number INTEGER NULL,
  episode_number INTEGER NULL,
  provider_id TEXT NULL,

  playback_playing BOOLEAN NOT NULL DEFAULT false,
  playback_position_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  playback_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for exact room code lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_cowatch_rooms_room_code ON cowatch_rooms (room_code);

-- Index for exact share slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_cowatch_rooms_share_slug ON cowatch_rooms (share_slug) WHERE share_slug IS NOT NULL;

-- Index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_cowatch_rooms_expires_at ON cowatch_rooms (expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE cowatch_rooms ENABLE ROW LEVEL SECURITY;
