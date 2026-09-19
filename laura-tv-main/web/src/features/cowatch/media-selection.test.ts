import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { completeMediaSelection, mediaTargetFromSearchParams } from './media-selection'
import { providers } from '../player/providers'

test('movie Watch Together carries the existing internal media ID', () => {
  const target = mediaTargetFromSearchParams(new URLSearchParams('type=movie&id=157336'))
  assert.deepEqual(target, { type: 'movie', id: 157336 })
  assert.deepEqual(target && completeMediaSelection(target), { type: 'movie', id: 157336, providerId: 'embedmaster' })
})

test('TV episode Watch Together carries show, season, and episode', () => {
  const target = mediaTargetFromSearchParams(new URLSearchParams('type=tv&id=1399&season=2&episode=3'))
  assert.deepEqual(target, { type: 'tv', id: 1399, season: 2, episode: 3 })
  assert.deepEqual(target && completeMediaSelection(target), { type: 'tv', id: 1399, season: 2, episode: 3, providerId: 'embedmaster' })
})

test('TV episode Season 0 specials are supported in selection and URL generation', () => {
  const target = mediaTargetFromSearchParams(new URLSearchParams('type=tv&id=1399&season=0&episode=1'))
  assert.deepEqual(target, { type: 'tv', id: 1399, season: 0, episode: 1 })
  assert.deepEqual(target && completeMediaSelection(target), { type: 'tv', id: 1399, season: 0, episode: 1, providerId: 'embedmaster' })
  
  // Verify all 7 providers generate valid Season 0 URLs
  for (const provider of providers) {
    const url = provider.getUrl(1399, 'tv', 0, 1)
    assert.match(url, /\/0\/1/, `Provider ${provider.id} should include /0/1 in TV URL`)
  }
})

test('TV show selection remains incomplete until a visible season and episode are chosen', () => {
  const target = mediaTargetFromSearchParams(new URLSearchParams('type=tv&id=1399'))
  if (!target) throw new Error('Expected a TV selection target')
  assert.equal(completeMediaSelection(target), null)
  assert.deepEqual(completeMediaSelection(target, 1, 1), { type: 'tv', id: 1399, season: 1, episode: 1, providerId: 'embedmaster' })
  assert.deepEqual(completeMediaSelection(target, 0, 1), { type: 'tv', id: 1399, season: 0, episode: 1, providerId: 'embedmaster' })
})

test('the user-facing Cowatch picker is title search based and has no raw TMDB ID input', async () => {
  const source = await readFile(new URL('./MediaPicker.tsx', import.meta.url), 'utf8')
  assert.match(source, /Search movies and TV shows/)
  assert.match(source, /searchMovies/)
  assert.match(source, /searchTVShows/)
  assert.doesNotMatch(source, /type="number"[^>]*(tmdb|media)/i)
  assert.doesNotMatch(source, /TMDB ID/i)
})
