import assert from 'node:assert/strict'
import test from 'node:test'
import { providerAdapters } from './player-adapters'
import {
  applyObservedPlayerEvent,
  buildHostTimelineReport,
  consumeExpectedProviderEcho,
  derivePlayerSyncState,
  hasPendingExpectedPlaybackEcho,
  initialObservedPlaybackState,
  queueExpectedProviderEcho,
  updateIframeInstance,
} from './player-state'

const desiredPlaying = { playing: true, currentTime: 40, updatedAt: 1_000 }

test('separates desired room playback from locally observed playback', () => {
  const observed = initialObservedPlaybackState()
  assert.equal(buildHostTimelineReport(desiredPlaying, observed, providerAdapters.embedmaster, 4_000).playing, false)
  const confirmed = applyObservedPlayerEvent(observed, { type: 'play' }, true, 4_000)
  assert.equal(buildHostTimelineReport(desiredPlaying, confirmed, providerAdapters.embedmaster, 4_100).playing, true)
  const paused = applyObservedPlayerEvent(confirmed, { type: 'pause' }, true, 4_200)
  assert.equal(buildHostTimelineReport(desiredPlaying, paused, providerAdapters.embedmaster, 4_300).playing, false)
})

test('requires sustained forward progression rather than one isolated timeupdate', () => {
  const first = applyObservedPlayerEvent(initialObservedPlaybackState(), { type: 'timeupdate', currentTime: 10 }, true, 1_000)
  assert.equal(first.status, 'unknown')
  const second = applyObservedPlayerEvent(first, { type: 'timeupdate', currentTime: 11 }, true, 2_000)
  assert.equal(second.status, 'unknown')
  const third = applyObservedPlayerEvent(second, { type: 'timeupdate', currentTime: 12 }, true, 3_000)
  assert.equal(third.status, 'playing')
  assert.equal(derivePlayerSyncState(desiredPlaying, third, 'ready', providerAdapters.vidlink, false, 3_100), 'synced')
})

test('keeps unlock and limited-provider sync states truthful', () => {
  const observed = initialObservedPlaybackState()
  assert.equal(derivePlayerSyncState(desiredPlaying, observed, 'loaded', providerAdapters.embedmaster), 'needs-user-gesture')
  assert.equal(derivePlayerSyncState(desiredPlaying, observed, 'loaded', providerAdapters.vidzee), 'limited-provider')
  const playing = applyObservedPlayerEvent(observed, { type: 'play' }, true, 2_000)
  assert.equal(derivePlayerSyncState(desiredPlaying, playing, 'ready', providerAdapters.embedmaster, false, 2_100), 'synced')
})

test('forces same-url retries without remounting for ordinary identical state', () => {
  const initial = { src: 'https://example.test/player', revision: 1 }
  assert.equal(updateIframeInstance(initial, initial.src), initial)
  assert.deepEqual(updateIframeInstance(initial, initial.src, true), { src: initial.src, revision: 2 })
})

test('suppresses only the expected unexpired provider echo', () => {
  const pause = { actionId: 'ABC', type: 'pause' as const, expiresAt: 2_000 }
  const echoes = queueExpectedProviderEcho([], pause, 1_000)
  assert.equal(consumeExpectedProviderEcho(echoes, { type: 'pause' }, 1_500).suppressed, true)
  assert.equal(consumeExpectedProviderEcho(echoes, { type: 'seek', currentTime: 50 }, 1_500).suppressed, false)
  assert.deepEqual(consumeExpectedProviderEcho(echoes, { type: 'pause' }, 2_001), { suppressed: false, remaining: [] })
})

test('keeps only the latest action identity for each expected event type', () => {
  const previous = { actionId: 'OLD', type: 'play' as const, expiresAt: 2_000 }
  const latest = { actionId: 'NEW', type: 'play' as const, expiresAt: 3_000 }
  assert.deepEqual(queueExpectedProviderEcho([previous], latest, 1_500), [latest])
})

test('keeps contradictory provider events suppressed while a room playback command is converging', () => {
  const pause = { actionId: 'REMOTE-PAUSE', type: 'pause' as const, expiresAt: 4_000 }
  assert.equal(hasPendingExpectedPlaybackEcho([pause], 3_000), true)
  assert.equal(hasPendingExpectedPlaybackEcho([pause], 4_001), false)
  assert.equal(hasPendingExpectedPlaybackEcho([{ actionId: 'SEEK', type: 'seek', expiresAt: 4_000 }], 3_000), false)
})
