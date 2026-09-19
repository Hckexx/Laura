import assert from 'node:assert/strict'
import test from 'node:test'
import { searchWithExactId } from '../../services/media-api/search-merge'

test('ordinary titles only use text search', async () => {
  let exactCalls = 0
  const results = await searchWithExactId('Fight Club', async () => [{ id: 550, title: 'Fight Club' }], async () => {
    exactCalls += 1
    return { id: 550 }
  })
  assert.deepEqual(results, [{ id: 550, title: 'Fight Club' }])
  assert.equal(exactCalls, 0)
})

test('numeric query attempts exact lookup and text search, with exact match first and deduplicated', async () => {
  let textCalls = 0
  let exactId = 0
  const results = await searchWithExactId(' 550 ', async () => {
    textCalls += 1
    return [{ id: 20, title: 'Studio 550' }, { id: 550, title: 'Search copy' }]
  }, async (id) => {
    exactId = id
    return { id: 550, title: 'Exact details' }
  })
  assert.equal(textCalls, 1)
  assert.equal(exactId, 550)
  assert.deepEqual(results, [{ id: 550, title: 'Exact details' }, { id: 20, title: 'Studio 550' }])
})

test('numeric titles still retain text results when exact details do not exist', async () => {
  const results = await searchWithExactId('1917', async () => [{ id: 530915, title: '1917' }], async () => {
    throw new Error('not found')
  })
  assert.deepEqual(results, [{ id: 530915, title: '1917' }])
})

test('invalid exact response does not hide text results', async () => {
  const results = await searchWithExactId('550', async () => [{ id: 99, title: '550 Days' }], async () => ({ id: 551 }))
  assert.deepEqual(results, [{ id: 99, title: '550 Days' }])
})
