import type { AndroidRelease } from './types';

const SUPABASE_URL =
  import.meta.env.VITE_LAURATV_SUPABASE_URL?.trim();

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_LAURATV_SUPABASE_ANON_KEY?.trim();

const RELEASE_BUCKET = 'lauratv-releases';

type ReleaseRow = {
  id: unknown;
  platform: unknown;
  version_name: unknown;
  version_code: unknown;
  release_notes: unknown;
  apk_path: unknown;
  is_active: unknown;
  published_at: unknown;
};

function getConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'LauraTV release configuration is missing.',
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(SUPABASE_URL);
  } catch {
    throw new Error(
      'LauraTV Supabase URL is invalid.',
    );
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(
      'LauraTV release endpoint must use HTTPS.',
    );
  }

  return {
    origin: parsed.origin,
    anonKey: SUPABASE_ANON_KEY,
  };
}

function parseRelease(
  row: ReleaseRow,
): AndroidRelease {
  if (
    typeof row.id !== 'string' ||
    row.platform !== 'android' ||
    typeof row.version_name !== 'string' ||
    typeof row.version_code !== 'number' ||
    !Number.isInteger(row.version_code) ||
    row.version_code <= 0 ||
    typeof row.apk_path !== 'string' ||
    !row.apk_path.trim() ||
    row.is_active !== true ||
    typeof row.published_at !== 'string'
  ) {
    throw new Error(
      'LauraTV release metadata is malformed.',
    );
  }

  return {
    id: row.id,
    versionName: row.version_name,
    versionCode: row.version_code,
    releaseNotes:
      typeof row.release_notes === 'string'
        ? row.release_notes
        : null,
    apkPath: row.apk_path,
    publishedAt: row.published_at,
  };
}

export async function fetchCurrentAndroidRelease(): Promise<AndroidRelease> {
  const {
    origin,
    anonKey,
  } = getConfig();

  const endpoint =
    `${origin}/rest/v1/app_releases` +
    `?select=id,platform,version_name,version_code,release_notes,apk_path,is_active,published_at` +
    `&platform=eq.android` +
    `&is_active=eq.true` +
    `&order=version_code.desc` +
    `&limit=1`;

  const controller =
    new AbortController();

  const timeout =
    window.setTimeout(() => {
      controller.abort();
    }, 8000);

  try {
    const response = await fetch(
      endpoint,
      {
        method: 'GET',

        headers: {
          apikey: anonKey,

          Authorization:
            `Bearer ${anonKey}`,

          Accept:
            'application/json',
        },

        signal:
          controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Release request failed with ${response.status}.`,
      );
    }

    const payload =
      (await response.json()) as ReleaseRow[];

    if (
      !Array.isArray(payload) ||
      payload.length !== 1
    ) {
      throw new Error(
        'No active LauraTV Android release exists.',
      );
    }

    return parseRelease(
      payload[0],
    );
  } finally {
    window.clearTimeout(
      timeout,
    );
  }
}

export function getAndroidReleaseDownloadUrl(
  release: AndroidRelease,
): string {
  const {
    origin,
  } = getConfig();

  const safePath =
    release.apkPath
      .split('/')
      .map(segment =>
        encodeURIComponent(segment),
      )
      .join('/');

  return (
    `${origin}/storage/v1/object/public/` +
    `${RELEASE_BUCKET}/${safePath}`
  );
}