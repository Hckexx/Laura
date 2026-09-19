import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSED_ANNOUNCEMENTS_KEY =
  '@laura_tv:dismissed_announcements';

const MAX_STORED_IDS = 100;

export async function getDismissedAnnouncementIds(): Promise<
  Set<string>
> {
  try {
    const raw = await AsyncStorage.getItem(
      DISMISSED_ANNOUNCEMENTS_KEY,
    );

    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    const validIds = parsed.filter(
      (value): value is string =>
        typeof value === 'string' &&
        value.length > 0,
    );

    return new Set(validIds);
  } catch {
    return new Set();
  }
}

export async function markAnnouncementDismissed(
  announcementId: string,
): Promise<void> {
  try {
    const dismissed =
      await getDismissedAnnouncementIds();

    dismissed.add(announcementId);

    const ids = Array.from(dismissed);

    const boundedIds =
      ids.length > MAX_STORED_IDS
        ? ids.slice(ids.length - MAX_STORED_IDS)
        : ids;

    await AsyncStorage.setItem(
      DISMISSED_ANNOUNCEMENTS_KEY,
      JSON.stringify(boundedIds),
    );
  } catch {
    /*
     * Failing to remember a dismissed announcement
     * must never crash LauraTV.
     */
  }
}