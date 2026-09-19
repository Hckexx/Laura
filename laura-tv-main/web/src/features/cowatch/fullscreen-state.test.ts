import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldHideFullscreenOverlay } from './fullscreen-state'

test('fullscreen overlays hide after sustained inactivity', () => {
  assert.equal(shouldHideFullscreenOverlay(1_000, false, 3_499), false)
  assert.equal(shouldHideFullscreenOverlay(1_000, false, 3_500), true)
})

test('hovering keeps fullscreen overlays visible', () => {
  assert.equal(shouldHideFullscreenOverlay(1_000, true, 10_000), false)
})
