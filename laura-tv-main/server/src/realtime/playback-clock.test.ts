import assert from 'node:assert/strict';
import test from 'node:test';
import { estimatePlayback } from './playback-clock.js';

test('advances a playing clock and leaves a paused clock unchanged', () => {
  assert.deepEqual(estimatePlayback({ playing: true, currentTime: 10, updatedAt: 1_000 }, 4_500), {
    playing: true, currentTime: 13.5, updatedAt: 4_500,
  });
  assert.deepEqual(estimatePlayback({ playing: false, currentTime: 10, updatedAt: 1_000 }, 4_500), {
    playing: false, currentTime: 10, updatedAt: 1_000,
  });
});
