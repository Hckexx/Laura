import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildCowatchPublicUrl } from '../../config/public-url'

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

test('room owns exactly one call surface and one shared control bar', () => {
  const roomSource = source('./Room.tsx')
  assert.equal((roomSource.match(/<CowatchCall\b/g) ?? []).length, 1)
  assert.equal((roomSource.match(/<CowatchControlBar\b/g) ?? []).length, 1)
})

test('player UI omits developer diagnostics and raw seek controls', () => {
  const playerSource = source('./CowatchPlayer.tsx')
  for (const developerText of ['direct-control', 'events observed', 'Room state:', 'Seek seconds']) {
    assert.equal(playerSource.includes(developerText), false)
  }
})

test('private room public URLs normalize trailing and leading slashes', () => {
  assert.equal(
    buildCowatchPublicUrl('https://watch.theunfilteredgoose.in///', '/midnight-room-123'),
    'https://watch.theunfilteredgoose.in/midnight-room-123',
  )
})
