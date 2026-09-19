import AsyncStorage from '@react-native-async-storage/async-storage';
import { providers } from '../../services/media-api/providers';
import type { ContinueWatchingRecord } from './types';

export const CONTINUE_WATCHING_KEY = '@laura_tv_continue_watching_v1';

const providerIds = new Set(providers.map(({ id }) => id));

const optionalFiniteNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

const normalizeRecord = (value: unknown): ContinueWatchingRecord | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.mediaId !== 'number' ||
    !Number.isInteger(record.mediaId) ||
    record.mediaId <= 0 ||
    (record.mediaType !== 'movie' && record.mediaType !== 'tv') ||
    typeof record.title !== 'string' ||
    !record.title.trim() ||
    typeof record.providerId !== 'string' ||
    !providerIds.has(record.providerId as ContinueWatchingRecord['providerId']) ||
    typeof record.updatedAt !== 'number' ||
    !Number.isFinite(record.updatedAt)
  ) {
    return null;
  }

  const season = optionalFiniteNumber(record.season);
  const episode = optionalFiniteNumber(record.episode);
  return {
    mediaId: record.mediaId,
    mediaType: record.mediaType,
    title: record.title.trim(),
    posterPath: typeof record.posterPath === 'string' ? record.posterPath : null,
    providerId: record.providerId as ContinueWatchingRecord['providerId'],
    updatedAt: record.updatedAt,
    ...(season !== undefined && Number.isInteger(season) ? { season } : {}),
    ...(episode !== undefined && Number.isInteger(episode) && episode >= 1 ? { episode } : {}),
    ...(typeof record.episodeName === 'string' && record.episodeName.trim()
      ? { episodeName: record.episodeName.trim() }
      : {}),
    ...(optionalFiniteNumber(record.positionSeconds) !== undefined
      ? { positionSeconds: optionalFiniteNumber(record.positionSeconds) }
      : {}),
    ...(optionalFiniteNumber(record.durationSeconds) !== undefined
      ? { durationSeconds: optionalFiniteNumber(record.durationSeconds) }
      : {}),
  };
};

export async function getContinueWatching(): Promise<ContinueWatchingRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(CONTINUE_WATCHING_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRecord)
      .filter((record): record is ContinueWatchingRecord => record !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.warn('Failed to read Continue Watching history:', error);
    return [];
  }
}

export async function upsertContinueWatching(record: ContinueWatchingRecord) {
  try {
    const current = await getContinueWatching();
    const updated = [
      record,
      ...current.filter(
        (item) => !(item.mediaId === record.mediaId && item.mediaType === record.mediaType),
      ),
    ].slice(0, 30);
    await AsyncStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('Failed to update Continue Watching history:', error);
    return [];
  }
}

export async function removeContinueWatching(mediaId: number, mediaType: 'movie' | 'tv') {
  try {
    const current = await getContinueWatching();
    const updated = current.filter(
      (item) => !(item.mediaId === mediaId && item.mediaType === mediaType),
    );
    await AsyncStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('Failed to remove Continue Watching history:', error);
    return [];
  }
}

export const isCompletedProgress = (positionSeconds?: number, durationSeconds?: number) =>
  positionSeconds !== undefined &&
  durationSeconds !== undefined &&
  durationSeconds > 0 &&
  positionSeconds / durationSeconds >= 0.95;

export const buildContinueWatchingHref = (record: ContinueWatchingRecord) => {
  const params = [`type=${record.mediaType}`];
  if (record.season !== undefined) params.push(`season=${record.season}`);
  if (record.episode !== undefined) params.push(`episode=${record.episode}`);
  return `/watch/${record.mediaId}?${params.join('&')}`;
};
