import assert from 'node:assert/strict'
import test from 'node:test'
import { providers } from '../player/providers'
import {
  buildCowatchEmbedUrl,
  createProviderCommand,
  estimateClientTime,
  getPlaybackActionMode,
  parseProviderMessage,
  parseProviderWindowMessage,
  providerAdapters,
  requiresPlaybackUnlock,
  shouldForwardProviderEvent,
  shouldReloadForPlaybackAction,
} from './player-adapters'

test('keeps exactly seven providers in the required order with correct normal Watch URLs', () => {
  assert.deepEqual(providers.map(({ id }) => id), ['embedmaster', 'vidzee', 'vidlink', 'poseidon', 'zeus', 'hades', 'erebus'])
  assert.deepEqual(providers.map(({ name }) => name), ['Apollo', 'Athena', 'Hermes', 'Poseidon', 'Zeus', 'Hades', 'Erebus'])
  const byId = Object.fromEntries(providers.map((provider) => [provider.id, provider]))
  assert.equal(byId.vidzee.getUrl(550, 'movie'), 'https://player.vidzee.wtf/embed/movie/550')
  assert.equal(byId.vidzee.getUrl(1399, 'tv', 2, 3), 'https://player.vidzee.wtf/embed/tv/1399/2/3')
  assert.equal(byId.embedmaster.getUrl(550, 'movie'), 'https://embedmaster.link/movie/550')
  assert.equal(byId.embedmaster.getUrl(1399, 'tv', 2, 3), 'https://embedmaster.link/tv/1399/2/3')
  assert.equal(byId.vidlink.getUrl(550, 'movie'), 'https://vidlink.pro/movie/550')
  assert.equal(byId.vidlink.getUrl(1399, 'tv', 2, 3), 'https://vidlink.pro/tv/1399/2/3')
})

test('exposes truthful capabilities for all seven ordered adapters', () => {
  assert.deepEqual(Object.keys(providerAdapters), ['embedmaster', 'vidzee', 'vidlink', 'poseidon', 'zeus', 'hades', 'erebus'])
  assert.equal(providerAdapters.poseidon.syncStrategy, 'event-assisted')
  assert.equal(providerAdapters.zeus.syncStrategy, 'timestamp-sync')
  assert.equal(providerAdapters.hades.canAutoplay, false)
  assert.equal(providerAdapters.erebus.canObserveTime, false)
  assert.deepEqual(
    {
      strategy: providerAdapters.embedmaster.syncStrategy,
      direct: providerAdapters.embedmaster.canReceiveDirectCommands,
      timestamp: providerAdapters.embedmaster.canStartAtTimestamp,
    },
    { strategy: 'direct-control', direct: true, timestamp: false },
  )
  assert.deepEqual(
    {
      playPause: providerAdapters.vidzee.canObservePlayPause,
      seek: providerAdapters.vidzee.canObserveSeek,
      time: providerAdapters.vidzee.canObserveTime,
      direct: providerAdapters.vidzee.canReceiveDirectCommands,
      timestamp: providerAdapters.vidzee.canStartAtTimestamp,
    },
    { playPause: true, seek: true, time: true, direct: false, timestamp: false },
  )
  assert.equal(providerAdapters.vidlink.canStartAtTimestamp, true)
  assert.equal(providerAdapters.vidlink.canAutoplay, true)
})

test('builds only verified provider timestamp and autoplay parameters', () => {
  const paused = { playing: false, currentTime: 42, updatedAt: 1 }
  const playing = { ...paused, playing: true, updatedAt: Date.now() }
  assert.match(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'poseidon' }, paused), /progress=42.0/)
  assert.match(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'zeus' }, paused), /t=42.0/)
  assert.match(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'hades' }, paused), /server=gama&startAt=42.0/)
  assert.match(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'erebus' }, paused), /startAt=42.0/)
  assert.match(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'vidlink' }, paused), /startAt=42.0/)
  assert.match(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'vidlink' }, playing), /autoplay=true/)
  assert.match(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'vidlink' }, paused), /autoplay=false/)
  assert.equal(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'embedmaster' }, paused), 'https://embedmaster.link/movie/550')
  assert.equal(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'vidzee' }, paused), 'https://player.vidzee.wtf/embed/movie/550')
  assert.doesNotMatch(buildCowatchEmbedUrl({ type: 'movie', id: 550, providerId: 'hades' }, playing), /autoplay/i)
})

test('parses only strict EmbedMaster player messages and finite non-negative times', () => {
  const origin = 'https://embdmstrplayer.com'
  const message = (event: string, info?: unknown) => ({ source: 'embedmaster_player', event, info })
  assert.deepEqual(parseProviderMessage('embedmaster', origin, message('play')), { type: 'play' })
  assert.deepEqual(parseProviderMessage('embedmaster', origin, message('pause')), { type: 'pause' })
  assert.deepEqual(parseProviderMessage('embedmaster', origin, message('time', 12.5)), { type: 'timeupdate', currentTime: 12.5 })
  assert.deepEqual(parseProviderMessage('embedmaster', origin, message('seek', { currentTime: 30 })), { type: 'seek', currentTime: 30 })
  assert.equal(parseProviderMessage('embedmaster', 'https://embedmaster.link', message('play')), undefined)
  assert.equal(parseProviderMessage('embedmaster', origin, { source: 'other', event: 'play' }), undefined)
  assert.equal(parseProviderMessage('embedmaster', origin, null), undefined)
  for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY, '12']) {
    assert.equal(parseProviderMessage('embedmaster', origin, message('time', invalid)), undefined)
  }
})

test('requires the active iframe window as well as the exact provider origin', () => {
  const activeWindow = {} as MessageEventSource
  const otherWindow = {} as MessageEventSource
  const data = { source: 'embedmaster_player', event: 'play' }
  assert.deepEqual(parseProviderWindowMessage('embedmaster', activeWindow, { source: activeWindow, origin: 'https://embdmstrplayer.com', data }), { type: 'play' })
  assert.equal(parseProviderWindowMessage('embedmaster', activeWindow, { source: otherWindow, origin: 'https://embdmstrplayer.com', data }), undefined)
  assert.equal(parseProviderWindowMessage('embedmaster', activeWindow, { source: activeWindow, origin: 'https://attacker.example', data }), undefined)
})

test('creates exact EmbedMaster command envelopes without sharing volume state', () => {
  assert.deepEqual(createProviderCommand('embedmaster', { command: 'play' }), {
    message: { source: 'embedmaster_player_command', command: 'play' }, targetOrigin: '*',
  })
  assert.deepEqual(createProviderCommand('embedmaster', { command: 'pause' }), {
    message: { source: 'embedmaster_player_command', command: 'pause' }, targetOrigin: '*',
  })
  assert.deepEqual(createProviderCommand('embedmaster', { command: 'seek', value: 300 }), {
    message: { source: 'embedmaster_player_command', command: 'seek', value: 300 }, targetOrigin: '*',
  })
  assert.equal(createProviderCommand('vidlink', { command: 'play' }), undefined)
})

test('parses VidLink PLAYER_EVENT messages and ignores MEDIA_DATA or malformed values', () => {
  const origin = 'https://vidlink.pro'
  const event = (name: string, currentTime?: unknown) => ({ type: 'PLAYER_EVENT', data: { event: name, currentTime } })
  assert.deepEqual(parseProviderMessage('vidlink', origin, event('play', 1)), { type: 'play', currentTime: 1 })
  assert.deepEqual(parseProviderMessage('vidlink', origin, event('pause', 2)), { type: 'pause', currentTime: 2 })
  assert.deepEqual(parseProviderMessage('vidlink', origin, event('seeked', 3)), { type: 'seek', currentTime: 3 })
  assert.deepEqual(parseProviderMessage('vidlink', origin, event('timeupdate', 4)), { type: 'timeupdate', currentTime: 4 })
  assert.deepEqual(parseProviderMessage('vidlink', origin, event('ended', 5)), { type: 'ended', currentTime: 5 })
  assert.equal(parseProviderMessage('vidlink', origin, { type: 'MEDIA_DATA', data: { event: 'play' } }), undefined)
  assert.equal(parseProviderMessage('vidlink', origin, event('play', Number.NaN)), undefined)
  assert.equal(parseProviderMessage('vidlink', 'https://attacker.example', event('play', 1)), undefined)
})

test('parses VidZee PLAYER_EVENT messages defensively and ignores unsupported messages', () => {
  const origin = 'https://player.vidzee.wtf'
  const event = (name: string, currentTime?: unknown) => ({ type: 'PLAYER_EVENT', data: { event: name, currentTime } })
  assert.deepEqual(parseProviderMessage('vidzee', origin, event('play', 1)), { type: 'play', currentTime: 1 })
  assert.deepEqual(parseProviderMessage('vidzee', origin, event('pause', 2)), { type: 'pause', currentTime: 2 })
  assert.deepEqual(parseProviderMessage('vidzee', origin, event('seeked', 3)), { type: 'seek', currentTime: 3 })
  assert.deepEqual(parseProviderMessage('vidzee', origin, event('timeupdate', 4)), { type: 'timeupdate', currentTime: 4 })
  assert.equal(parseProviderMessage('vidzee', origin, { type: 'MEDIA_DATA', data: { event: 'play' } }), undefined)
  assert.equal(parseProviderMessage('vidzee', origin, event('pause', Number.POSITIVE_INFINITY)), undefined)
  assert.equal(parseProviderMessage('vidzee', 'https://vidzee.wtf', event('play', 1)), undefined)
})

test('preserves exact-origin parsing for stabilized providers', () => {
  const message = JSON.stringify({ type: 'PLAYER_EVENT', data: { event: 'timeupdate', currentTime: 12.5 } })
  assert.deepEqual(parseProviderMessage('poseidon', 'https://www.vidking.net', message), { type: 'timeupdate', currentTime: 12.5 })
  assert.deepEqual(parseProviderMessage('erebus', 'https://vidcore.org', 'vidcore:play'), { type: 'play' })
  assert.equal(parseProviderMessage('hades', 'https://vidnest.fun', message), undefined)
  assert.equal(parseProviderMessage('zeus', 'https://vidsrc.sbs', message), undefined)
  assert.equal(parseProviderMessage('poseidon', 'https://attacker.example', message), undefined)
  assert.equal(parseProviderMessage('poseidon', 'https://www.vidking.net', '{bad'), undefined)
})

test('uses direct control for remote EmbedMaster actions and reload fallback for timestamp providers', () => {
  const playback = { playing: true, currentTime: 20, updatedAt: 1, actionId: 'server-action-1', sourceActionId: 'action-1' }
  for (const action of ['play', 'pause', 'seek'] as const) {
    assert.equal(getPlaybackActionMode('embedmaster', { ...playback, action, actorId: 'remote' }, 'local', new Set(['action-1'])), 'direct')
  }
  assert.equal(getPlaybackActionMode('vidlink', { ...playback, action: 'play', actorId: 'remote' }, 'local', new Set(['action-1'])), 'reload')
  assert.equal(getPlaybackActionMode('vidzee', { ...playback, action: 'play', actorId: 'remote' }, 'local', new Set(['action-1'])), 'none')
  assert.equal(getPlaybackActionMode('poseidon', { ...playback, action: 'play', actorId: 'local' }, 'local', new Set(['action-1'])), 'none')
  assert.equal(shouldReloadForPlaybackAction({ ...playback, action: 'play', actorId: 'remote' }, 'local', new Set(['action-1'])), true)
  assert.equal(shouldReloadForPlaybackAction({ playing: true, currentTime: 20, updatedAt: 1 }, 'local', new Set()), false)
})

test('suppresses provider echoes caused by authoritative direct commands', () => {
  const playing = { playing: true, currentTime: 20, updatedAt: 1 }
  assert.equal(shouldForwardProviderEvent({ type: 'pause' }, playing, false, true), false)
  assert.equal(shouldForwardProviderEvent({ type: 'seek', currentTime: 30 }, playing, true, true), false)
  assert.equal(shouldForwardProviderEvent({ type: 'pause' }, playing, false, false), true)
  assert.equal(shouldForwardProviderEvent({ type: 'seek', currentTime: 30 }, playing, false, false), false)
})

test('requires a truthful local playback unlock until play is actually observed', () => {
  const playback = { playing: true, currentTime: 20, updatedAt: 1 }
  assert.equal(requiresPlaybackUnlock(playback, 'unknown'), true)
  assert.equal(requiresPlaybackUnlock(playback, 'paused'), true)
  assert.equal(requiresPlaybackUnlock(playback, 'playing'), false)
  assert.equal(requiresPlaybackUnlock({ ...playback, playing: false }, 'unknown'), false)
})

test('estimates the authoritative client clock only while playing', () => {
  assert.equal(estimateClientTime({ playing: true, currentTime: 10, updatedAt: 1_000 }, 4_000), 13)
  assert.equal(estimateClientTime({ playing: false, currentTime: 10, updatedAt: 1_000 }, 4_000), 10)
})
