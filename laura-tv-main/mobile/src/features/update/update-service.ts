import * as Application from 'expo-application';
import type {
  AppRelease,
  CachedReleasePolicy,
} from './types';

const RELEASES_SUPABASE_URL =
  process.env.EXPO_PUBLIC_RELEASES_SUPABASE_URL?.trim();

const RELEASES_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_RELEASES_SUPABASE_ANON_KEY?.trim();

export const LAURATV_DOWNLOAD_URL =
  'https://watch.theunfilteredgoose.in';

type SupabaseReleaseRow = {
  id: unknown;
  platform: unknown;
  version_name: unknown;
  version_code: unknown;
  release_notes: unknown;
  apk_path: unknown;
  published_at: unknown;
  is_active: unknown;
};

function assertPublicReleaseConfig(): {
  url: string;
  anonKey: string;
} {
  if (
    !RELEASES_SUPABASE_URL ||
    !RELEASES_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      'LauraTV release-check configuration is missing.',
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(RELEASES_SUPABASE_URL);
  } catch {
    throw new Error(
      'LauraTV release-check Supabase URL is invalid.',
    );
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error(
      'LauraTV release-check endpoint must use HTTPS.',
    );
  }

  return {
    url: parsedUrl.origin,
    anonKey: RELEASES_SUPABASE_ANON_KEY,
  };
}

function parseReleaseRow(
  row: SupabaseReleaseRow,
): AppRelease {
  if (
    typeof row.id !== 'string' ||
    row.platform !== 'android' ||
    typeof row.version_name !== 'string' ||
    typeof row.version_code !== 'number' ||
    !Number.isInteger(row.version_code) ||
    row.version_code <= 0 ||
    typeof row.published_at !== 'string' ||
    row.is_active !== true
  ) {
    throw new Error(
      'LauraTV release metadata is malformed.',
    );
  }

  return {
    id: row.id,
    platform: 'android',
    versionName: row.version_name,
    versionCode: row.version_code,
    releaseNotes:
      typeof row.release_notes === 'string'
        ? row.release_notes
        : null,
    apkPath:
      typeof row.apk_path === 'string'
        ? row.apk_path
        : null,
    publishedAt: row.published_at,
  };
}

export function getInstalledVersionCode(): number {
  const nativeBuildVersion =
    Application.nativeBuildVersion;

  if (!nativeBuildVersion) {
    throw new Error(
      'Unable to determine installed LauraTV versionCode.',
    );
  }

  const parsed = Number(nativeBuildVersion);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    throw new Error(
      'Installed LauraTV versionCode is invalid.',
    );
  }

  return parsed;
}

export function getInstalledVersionName(): string {
  return Application.nativeApplicationVersion ?? 'Unknown';
}

export async function fetchLatestRelease(): Promise<AppRelease> {
  const { url, anonKey } =
    assertPublicReleaseConfig();

  const endpoint =
    `${url}/rest/v1/app_releases` +
    `?select=id,platform,version_name,version_code,release_notes,apk_path,published_at,is_active` +
    `&platform=eq.android` +
    `&is_active=eq.true` +
    `&order=version_code.desc` +
    `&limit=1`;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `LauraTV release check failed with HTTP ${response.status}.`,
      );
    }

    const payload =
      (await response.json()) as SupabaseReleaseRow[];

    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error(
        'No active LauraTV Android release is configured.',
      );
    }

    return parseReleaseRow(payload[0]);
  } finally {
    clearTimeout(timeout);
  }
}

export function releaseToCache(
  release: AppRelease,
): CachedReleasePolicy {
  return {
    latestVersionCode: release.versionCode,
    latestVersionName: release.versionName,
    releaseNotes: release.releaseNotes,
    apkPath: release.apkPath,
    checkedAt: Date.now(),
  };
}

export function cachedPolicyToRelease(
  cached: CachedReleasePolicy,
): AppRelease {
  return {
    id: 'cached-release-policy',
    platform: 'android',
    versionName: cached.latestVersionName,
    versionCode: cached.latestVersionCode,
    releaseNotes: cached.releaseNotes,
    apkPath: cached.apkPath,
    publishedAt: new Date(cached.checkedAt).toISOString(),
  };
}