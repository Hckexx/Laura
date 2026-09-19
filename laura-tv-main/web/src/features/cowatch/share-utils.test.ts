import assert from 'node:assert/strict'
import test from 'node:test'
import { isShareCancellation, shareRoomInvite, type ShareNavigator } from './share-utils'

const navigatorWithClipboard = (writes: string[]): ShareNavigator => ({
  clipboard: { writeText: async (value: string) => { writes.push(value) } } as Clipboard,
})

test('share falls back to clipboard when native sharing is unavailable', async () => {
  const writes: string[] = []
  assert.equal(await shareRoomInvite(navigatorWithClipboard(writes), 'https://watch.example/room'), 'copied')
  assert.deepEqual(writes, ['https://watch.example/room'])
})

test('native share cancellation is not treated as an error or clipboard action', async () => {
  const writes: string[] = []
  const navigatorApi = navigatorWithClipboard(writes)
  navigatorApi.share = async () => { throw { name: 'AbortError' } }
  assert.equal(await shareRoomInvite(navigatorApi, 'https://watch.example/room'), 'cancelled')
  assert.equal(isShareCancellation({ name: 'AbortError' }), true)
  assert.deepEqual(writes, [])
})
