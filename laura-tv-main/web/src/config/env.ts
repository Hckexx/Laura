type ViteEnvLike = Record<
  string,
  string | boolean | undefined
>;

const viteEnv = (
  import.meta as ImportMeta & {
    env?: ViteEnvLike;
  }
).env;

const isBrowser =
  typeof window !== 'undefined';

const isProduction =
  Boolean(viteEnv?.PROD);

const DEFAULT_MEDIA_API =
  'https://ibrax-server.onrender.com/api/v1';

const DEFAULT_LOCAL_COWATCH_URL =
  'http://localhost:3000';

const DEFAULT_PUBLIC_COWATCH_URL =
  'https://watch.theunfilteredgoose.in';

const readString = (
  name: string,
): string | undefined => {
  const value = viteEnv?.[name];

  return typeof value === 'string' &&
    value.trim()
    ? value.trim()
    : undefined;
};

const validateHttpUrl = (
  name: string,
  value: string,
): string => {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `${name} must be a valid absolute URL.`,
    );
  }

  if (
    parsed.protocol !== 'http:' &&
    parsed.protocol !== 'https:'
  ) {
    throw new Error(
      `${name} must use http:// or https://.`,
    );
  }

  if (
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      `${name} must not contain embedded credentials.`,
    );
  }

  return value.replace(/\/+$/, '');
};

/*
 * MEDIA API
 *
 * This is intentionally public.
 * LauraTV currently uses the existing IBRAX Render API
 * for movie/TV metadata and search.
 */
const apiBaseUrl =
  validateHttpUrl(
    'VITE_API_BASE_URL',
    readString(
      'VITE_API_BASE_URL',
    ) || DEFAULT_MEDIA_API,
  );

/*
 * COWATCH REALTIME BACKEND
 *
 * In development/local verification:
 *   http://localhost:3000
 *
 * In deployed Vercel production:
 *   VITE_COWATCH_URL will be injected with the
 *   HTTPS Railway backend URL.
 *
 * Actual Vercel deployment validation happens
 * in vite.config.ts at build time.
 */
const configuredCowatchUrl =
  readString(
    'VITE_COWATCH_URL',
  );

const cowatchUrl =
  validateHttpUrl(
    'VITE_COWATCH_URL',

    configuredCowatchUrl ||
      (!isBrowser
        ? DEFAULT_LOCAL_COWATCH_URL
        : isProduction
          ? DEFAULT_LOCAL_COWATCH_URL
          : DEFAULT_LOCAL_COWATCH_URL),
  );

/*
 * PUBLIC ROOM URL
 *
 * This is the user-facing URL used when sharing
 * private Cowatch rooms.
 */
const cowatchPublicUrl =
  validateHttpUrl(
    'VITE_COWATCH_PUBLIC_URL',

    readString(
      'VITE_COWATCH_PUBLIC_URL',
    ) ||
      DEFAULT_PUBLIC_COWATCH_URL,
  );

export const config = {
  apiBaseUrl,
  cowatchUrl,
  cowatchPublicUrl,

  tmdbImageBase:
    'https://image.tmdb.org/t/p/w500',

  tmdbBackdropBase:
    'https://image.tmdb.org/t/p/original',
} as const;