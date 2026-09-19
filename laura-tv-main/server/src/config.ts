const positiveInteger = (
  value: string | undefined,
  fallback: number,
) => {
  const parsed = Number.parseInt(
    value ?? '',
    10,
  );

  return Number.isFinite(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
};

const nodeEnv = (
  process.env.NODE_ENV || 'development'
)
  .trim()
  .toLowerCase();

const isProduction =
  nodeEnv === 'production';

const normalizeCorsOrigin = (
  rawOrigin: string,
): string => {
  let parsed: URL;

  try {
    parsed = new URL(rawOrigin);
  } catch {
    throw new Error(
      `Invalid CORS origin: "${rawOrigin}".`,
    );
  }

  if (
    parsed.protocol !== 'http:' &&
    parsed.protocol !== 'https:'
  ) {
    throw new Error(
      `CORS origin "${rawOrigin}" must use http:// or https://.`,
    );
  }

  if (
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      `CORS origin "${rawOrigin}" must not contain credentials.`,
    );
  }

  if (
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `CORS origin "${rawOrigin}" must contain only an origin, with no path, query, or hash.`,
    );
  }

  if (
    isProduction &&
    parsed.protocol !== 'https:'
  ) {
    throw new Error(
      `Production CORS origin "${rawOrigin}" must use https://.`,
    );
  }

  return parsed.origin;
};

const parseCorsOrigins = () => {
  const configured =
    process.env.CORS_ORIGINS?.trim();

  if (!configured) {
    if (isProduction) {
      throw new Error(
        'CORS_ORIGINS is required in production. Use an explicit comma-separated allowlist.',
      );
    }

    return [
      'http://localhost:3173',
      'http://127.0.0.1:3173',
    ];
  }

  const rawOrigins = configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (rawOrigins.length === 0) {
    throw new Error(
      'CORS_ORIGINS must contain at least one origin.',
    );
  }

  if (rawOrigins.includes('*')) {
    if (isProduction) {
      throw new Error(
        'CORS_ORIGINS cannot contain "*" in production. Use explicit LauraTV frontend origins.',
      );
    }

    if (rawOrigins.length !== 1) {
      throw new Error(
        'When using "*" for development CORS, do not combine it with other origins.',
      );
    }

    return '*';
  }

  const normalizedOrigins =
    rawOrigins.map(
      normalizeCorsOrigin,
    );

  return [
    ...new Set(
      normalizedOrigins,
    ),
  ];
};

export const config = {
  nodeEnv,
  isProduction,

  port: positiveInteger(
    process.env.PORT,
    3000,
  ),

  /*
   * These remain only because the old local media
   * source files still compile against this config.
   *
   * The deployed Railway LauraTV server does NOT
   * register the TMDB/media routes.
   */
  tmdb: {
    apiToken:
      process.env.TMDB_API_TOKEN || '',

    baseUrl:
      'https://api.themoviedb.org/3',
  },

  cache: {
    ttlSeconds: positiveInteger(
      process.env.CACHE_TTL_SECONDS,
      3600,
    ),
  },

  cors: {
    origin:
      parseCorsOrigins(),
  },

  httpRateLimit: {
    max: positiveInteger(
      process.env.HTTP_RATE_LIMIT_MAX,
      240,
    ),

    timeWindowMs: positiveInteger(
      process.env.HTTP_RATE_LIMIT_WINDOW_MS,
      60_000,
    ),
  },
} as const;