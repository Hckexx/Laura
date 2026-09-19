const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const positiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const maxParticipants = positiveInteger(
  process.env.COWATCH_MAX_PARTICIPANTS,
  5,
);

const parseIceServers = (value: string | undefined) => {
  const fallback = [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ];

  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      parsed.length > 10
    ) {
      return fallback;
    }

    const validated = parsed.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const candidate = entry as {
        urls?: unknown;
        username?: unknown;
        credential?: unknown;
      };

      const urls =
        typeof candidate.urls === 'string'
          ? [candidate.urls]
          : Array.isArray(candidate.urls) &&
              candidate.urls.every(
                (url) => typeof url === 'string',
              )
            ? candidate.urls
            : [];

      if (
        urls.length === 0 ||
        urls.length > 10 ||
        urls.some(
          (url) =>
            !/^(stun|turn|turns):/.test(url) ||
            url.length > 2_048,
        )
      ) {
        return [];
      }

      if (
        candidate.username !== undefined &&
        (
          typeof candidate.username !== 'string' ||
          candidate.username.length > 512
        )
      ) {
        return [];
      }

      if (
        candidate.credential !== undefined &&
        (
          typeof candidate.credential !== 'string' ||
          candidate.credential.length > 1_024
        )
      ) {
        return [];
      }

      return [
        {
          urls:
            typeof candidate.urls === 'string'
              ? candidate.urls
              : urls,

          ...(typeof candidate.username === 'string'
            ? {
                username: candidate.username,
              }
            : {}),

          ...(typeof candidate.credential === 'string'
            ? {
                credential: candidate.credential,
              }
            : {}),
        },
      ];
    });

    return validated.length === parsed.length
      ? validated
      : fallback;
  } catch {
    return fallback;
  }
};

const nodeEnv = (
  process.env.NODE_ENV || 'development'
)
  .trim()
  .toLowerCase();

const isProduction =
  nodeEnv === 'production';

const configuredMode =
  process.env.COWATCH_PERSISTENCE_MODE
    ?.trim()
    .toLowerCase();

if (
  configuredMode &&
  configuredMode !== 'memory' &&
  configuredMode !== 'supabase'
) {
  throw new Error(
    'COWATCH_PERSISTENCE_MODE must be either "memory" or "supabase".',
  );
}

/*
 * Development/test:
 *   Missing mode defaults to memory.
 *
 * Production:
 *   Persistence MUST be explicitly configured as Supabase.
 *   We never silently run production rooms only in RAM.
 */
if (
  isProduction &&
  configuredMode !== 'supabase'
) {
  throw new Error(
    'Production Cowatch requires COWATCH_PERSISTENCE_MODE=supabase.',
  );
}

const persistenceMode:
  | 'supabase'
  | 'memory' =
  configuredMode === 'supabase'
    ? 'supabase'
    : 'memory';

export const cowatchConfig = {
  trustProxy:
    process.env.COWATCH_TRUST_PROXY === 'true',

  persistenceMode,

  maxParticipants,

  participant: {
    maxNameLength: 40,
  },

  permissions: {
    viewersCanPlayPause: true,
    viewersCanSeek: false,
    viewersCanChangeMedia: false,
    viewersCanChangeProvider: false,
  },

  room: {
    codeLength: positiveInteger(
      process.env.COWATCH_ROOM_CODE_LENGTH,
      6,
    ),

    hostReconnectGraceMs: positiveInteger(
      process.env.COWATCH_HOST_RECONNECT_GRACE_MS,
      30_000,
    ),

    emptyRoomExpiryMs: positiveInteger(
      process.env.COWATCH_EMPTY_ROOM_EXPIRY_MS,
      60_000,
    ),

    kickRejoinCooldownMs: positiveInteger(
      process.env.COWATCH_KICK_REJOIN_COOLDOWN_MS,
      15_000,
    ),

    inactivityExpiryMs: positiveInteger(
      process.env.COWATCH_ROOM_INACTIVITY_MS,
      15 * 60 * 1000,
    ),

    heartbeatIntervalMs: positiveInteger(
      process.env.COWATCH_HEARTBEAT_INTERVAL_MS,
      45_000,
    ),

    cleanupIntervalMs: positiveInteger(
      process.env.COWATCH_CLEANUP_INTERVAL_MS,
      10 * 60 * 1000,
    ),
  },

  sync: {
    broadcastIntervalMs: positiveInteger(
      process.env.COWATCH_SYNC_INTERVAL_MS,
      2_500,
    ),

    driftToleranceSeconds: positiveNumber(
      process.env.COWATCH_DRIFT_TOLERANCE_SECONDS,
      3,
    ),

    maxTimelineSeconds: positiveInteger(
      process.env.COWATCH_MAX_TIMELINE_SECONDS,
      24 * 60 * 60,
    ),
  },

  chat: {
    maxMessageLength: positiveInteger(
      process.env.COWATCH_CHAT_MAX_MESSAGE_LENGTH,
      500,
    ),

    maxRecentMessages: positiveInteger(
      process.env.COWATCH_CHAT_MAX_RECENT_MESSAGES,
      100,
    ),

    throttleWindowMs: 5_000,
    maxMessagesPerWindow: 5,
  },

  video: {
    maxParticipants,

    iceServers: parseIceServers(
      process.env.COWATCH_ICE_SERVERS_JSON,
    ),

    maxSessionDescriptionLength: positiveInteger(
      process.env.COWATCH_MAX_SDP_LENGTH,
      100_000,
    ),

    maxIceCandidateLength: positiveInteger(
      process.env.COWATCH_MAX_ICE_CANDIDATE_LENGTH,
      8_192,
    ),
  },

  providers: [
    'embedmaster',
    'vidzee',
    'vidlink',
    'poseidon',
    'zeus',
    'hades',
    'erebus',
  ] as const,

  abuseProtection: {
    createWindowMs: 60_000,
    maxCreatesPerWindow: 5,

    joinWindowMs: 60_000,
    maxJoinsPerWindow: 20,

    extremeViolationsBeforeBan: 8,

    eventWindowMs: 10_000,

    maxEventsPerWindow: positiveInteger(
      process.env.COWATCH_MAX_EVENTS_PER_WINDOW,
      120,
    ),

    extremeEventsPerWindow: positiveInteger(
      process.env.COWATCH_EXTREME_EVENTS_PER_WINDOW,
      500,
    ),

    temporaryBanMs: positiveInteger(
      process.env.COWATCH_TEMPORARY_BAN_MS,
      12 * 60 * 60 * 1000,
    ),
  },
} as const;