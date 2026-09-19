import type { PlaybackState } from './types.js';

export const estimatePlayback = (playback: PlaybackState, now = Date.now()): PlaybackState => {
  if (!playback.playing) return { ...playback };
  const elapsedSeconds = Math.max(0, now - playback.updatedAt) / 1_000;
  return { ...playback, currentTime: playback.currentTime + elapsedSeconds, updatedAt: now };
};
