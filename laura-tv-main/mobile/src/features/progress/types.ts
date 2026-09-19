import type { ProviderId } from '../../types/provider';

export type ContinueWatchingRecord = {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  season?: number;
  episode?: number;
  episodeName?: string;
  providerId: ProviderId;
  positionSeconds?: number;
  durationSeconds?: number;
  updatedAt: number;
};

export type PlaybackProgressUpdate = {
  kind: 'play' | 'pause' | 'progress' | 'ended';
  positionSeconds?: number;
  durationSeconds?: number;
};
