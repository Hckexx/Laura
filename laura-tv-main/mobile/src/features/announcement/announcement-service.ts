import type {
  AppAnnouncement,
  AnnouncementType,
} from './types';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_RELEASES_SUPABASE_URL?.trim();

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_RELEASES_SUPABASE_ANON_KEY?.trim();

type SupabaseAnnouncementRow = {
  id: unknown;
  title: unknown;
  message: unknown;
  type: unknown;
  maintenance_mode: unknown;
  is_active: unknown;
  created_at: unknown;
};

function getPublicSupabaseConfig(): {
  url: string;
  anonKey: string;
} {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'LauraTV announcement configuration is missing.',
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(SUPABASE_URL);
  } catch {
    throw new Error(
      'LauraTV announcement Supabase URL is invalid.',
    );
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error(
      'LauraTV announcement endpoint must use HTTPS.',
    );
  }

  return {
    url: parsedUrl.origin,
    anonKey: SUPABASE_ANON_KEY,
  };
}

function isAnnouncementType(
  value: unknown,
): value is AnnouncementType {
  return (
    value === 'info' ||
    value === 'warning' ||
    value === 'maintenance'
  );
}

function parseAnnouncement(
  row: SupabaseAnnouncementRow,
): AppAnnouncement | null {
  if (
    typeof row.id !== 'string' ||
    typeof row.title !== 'string' ||
    typeof row.message !== 'string' ||
    !isAnnouncementType(row.type) ||
    typeof row.maintenance_mode !== 'boolean' ||
    typeof row.created_at !== 'string' ||
    row.is_active !== true
  ) {
    return null;
  }

  const title = row.title.trim();
  const message = row.message.trim();

  if (!title || !message) {
    return null;
  }

  return {
    id: row.id,
    title,
    message,
    type: row.type,
    maintenanceMode: row.maintenance_mode,
    createdAt: row.created_at,
  };
}

export async function fetchActiveAnnouncements(): Promise<
  AppAnnouncement[]
> {
  const { url, anonKey } =
    getPublicSupabaseConfig();

  /*
   * starts_at / ends_at filtering is already enforced
   * by Supabase RLS.
   *
   * The client therefore asks only for active records.
   */
  const endpoint =
    `${url}/rest/v1/app_announcements` +
    `?select=id,title,message,type,maintenance_mode,is_active,created_at` +
    `&is_active=eq.true` +
    `&order=created_at.desc` +
    `&limit=25`;

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
        `LauraTV announcement check failed with HTTP ${response.status}.`,
      );
    }

    const payload =
      (await response.json()) as unknown;

    if (!Array.isArray(payload)) {
      throw new Error(
        'LauraTV announcement response is malformed.',
      );
    }

    return payload
      .map(row =>
        parseAnnouncement(
          row as SupabaseAnnouncementRow,
        ),
      )
      .filter(
        (
          announcement,
        ): announcement is AppAnnouncement =>
          announcement !== null,
      );
  } finally {
    clearTimeout(timeout);
  }
}