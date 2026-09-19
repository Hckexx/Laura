import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CachedReleasePolicy } from './types';

const RELEASE_POLICY_KEY = '@laura_tv:update_policy';

export async function getCachedReleasePolicy(): Promise<CachedReleasePolicy | null> {
  try {
    const raw = await AsyncStorage.getItem(RELEASE_POLICY_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CachedReleasePolicy>;

    if (
      typeof parsed.latestVersionCode !== 'number' ||
      !Number.isInteger(parsed.latestVersionCode) ||
      parsed.latestVersionCode <= 0 ||
      typeof parsed.latestVersionName !== 'string' ||
      typeof parsed.checkedAt !== 'number'
    ) {
      return null;
    }

    return {
      latestVersionCode: parsed.latestVersionCode,
      latestVersionName: parsed.latestVersionName,
      releaseNotes:
        typeof parsed.releaseNotes === 'string'
          ? parsed.releaseNotes
          : null,
      apkPath:
        typeof parsed.apkPath === 'string'
          ? parsed.apkPath
          : null,
      checkedAt: parsed.checkedAt,
    };
  } catch {
    return null;
  }
}

export async function saveCachedReleasePolicy(
  policy: CachedReleasePolicy,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      RELEASE_POLICY_KEY,
      JSON.stringify(policy),
    );
  } catch {
    // Update checks must never crash LauraTV because local
    // storage is temporarily unavailable.
  }
}