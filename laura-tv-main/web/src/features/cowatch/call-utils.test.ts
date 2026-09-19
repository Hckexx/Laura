import assert from 'node:assert/strict'
import test from 'node:test'
import { communicationAudioConstraints, mediaCaptureErrorMessage, removeTrackKind, setTrackKindEnabled, shouldInitiatePeerOffer, stopMediaStream } from './call-utils'

const fakeStream = () => {
  const tracks = [
    { id: 'audio-1', kind: 'audio', enabled: true, stopped: false, stop() { this.stopped = true } },
    { id: 'video-1', kind: 'video', enabled: true, stopped: false, stop() { this.stopped = true } },
  ]
  return { tracks, stream: { getTracks: () => tracks.filter(({ stopped }) => !stopped), removeTrack: (track: typeof tracks[number]) => { track.stopped = true } } as unknown as MediaStream }
}

test('toggles only the requested media track kind', () => {
  const { tracks, stream } = fakeStream()
  assert.equal(setTrackKindEnabled(stream, 'video', false), true)
  assert.equal(tracks[0].enabled, true)
  assert.equal(tracks[1].enabled, false)
  assert.equal(setTrackKindEnabled(stream, 'audio', false), true)
  assert.equal(tracks[0].enabled, false)
})

test('stops every local track during call cleanup', () => {
  const { tracks, stream } = fakeStream()
  stopMediaStream(stream)
  assert.equal(tracks.every(({ stopped }) => stopped), true)
})

test('unpublishing one media kind stops only that local track', () => {
  const { tracks, stream } = fakeStream()
  assert.deepEqual(removeTrackKind(stream, 'video'), ['video-1'])
  assert.equal(tracks[0].stopped, false)
  assert.equal(tracks[1].stopped, true)
})

test('explains secure-context and browser media-capture failures', () => {
  assert.match(mediaCaptureErrorMessage(new Error(), 'video', false, true), /HTTPS or localhost/)
  assert.match(mediaCaptureErrorMessage(new Error(), 'audio', true, false), /does not support microphone/)
})

test('uses communication audio processing and creates exactly one offer per mesh pair', () => {
  assert.deepEqual(communicationAudioConstraints, { echoCancellation: true, noiseSuppression: true, autoGainControl: true })
  const ids = ['a', 'b', 'c']
  const offers = ids.flatMap((local) => ids.filter((remote) => local !== remote && shouldInitiatePeerOffer(local, remote)).map((remote) => `${local}->${remote}`))
  assert.deepEqual(offers, ['b->a', 'c->a', 'c->b'])
})
