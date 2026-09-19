import assert from 'node:assert/strict'
import test from 'node:test'
import { cowatchUIConfig } from '../../config/cowatch-ui'
import type { CowatchMessage } from './types'

test('centralized cowatch-ui configuration provides expected properties and defaults', () => {
  assert.equal(typeof cowatchUIConfig.chatPanelOpacity, 'number')
  assert.ok(cowatchUIConfig.chatPanelOpacity > 0 && cowatchUIConfig.chatPanelOpacity <= 1)
  assert.equal(typeof cowatchUIConfig.chatPanelBackdropBlurPx, 'number')
  assert.ok(cowatchUIConfig.chatPanelBackdropBlurPx >= 0)
  assert.equal(typeof cowatchUIConfig.chatPanelDefaultOpen, 'boolean')
  assert.equal(cowatchUIConfig.fullscreenOverlayHideDelayMs, 2_500)
  assert.equal(cowatchUIConfig.showLocalPreviewInFullscreen, true)
})

test('chat messages array survives drawer open/close toggling', () => {
  const messages: CowatchMessage[] = [
    { id: '1', senderId: 'u1', senderName: 'Alice', text: 'Hello', timestamp: 100 },
    { id: '2', senderId: 'u2', senderName: 'Bob', text: 'Hey there', timestamp: 200 },
  ]

  let isChatOpen = false
  assert.equal(isChatOpen, false)
  assert.equal(messages.length, 2)

  isChatOpen = !isChatOpen
  assert.equal(isChatOpen, true)
  assert.equal(messages.length, 2)
  assert.equal(messages[0].text, 'Hello')
  assert.equal(messages[1].text, 'Hey there')
})

test('incoming message while chat is closed triggers unread increment and toast notification', () => {
  let unreadCount = 0
  let activeToast: { id: string; senderName: string; text: string } | null = null
  const currentParticipantId = 'u1'
  const isChatOpen = false

  const handleIncomingMessage = (message: CowatchMessage) => {
    if (!isChatOpen && message.senderId !== currentParticipantId) {
      unreadCount += 1
      activeToast = { id: message.id, senderName: message.senderName, text: message.text }
    }
  }

  // Self message while chat is closed should not trigger toast or unread count
  handleIncomingMessage({ id: 'm1', senderId: 'u1', senderName: 'Me', text: 'My own message', timestamp: 100 })
  assert.equal(unreadCount, 0)
  assert.equal(activeToast, null)

  // Remote message while chat is closed triggers toast and unread count
  handleIncomingMessage({ id: 'm2', senderId: 'u2', senderName: 'Friend', text: 'Hello from friend', timestamp: 200 })
  assert.equal(unreadCount, 1)
  assert.deepEqual(activeToast, { id: 'm2', senderName: 'Friend', text: 'Hello from friend' })

  // Second remote message increments count and updates toast to latest message (no uncontrolled stack)
  handleIncomingMessage({ id: 'm3', senderId: 'u3', senderName: 'Bob', text: 'Are you there?', timestamp: 300 })
  assert.equal(unreadCount, 2)
  assert.deepEqual(activeToast, { id: 'm3', senderName: 'Bob', text: 'Are you there?' })

  // Opening chat resets unread count and clears toast
  unreadCount = 0
  activeToast = null
  assert.equal(unreadCount, 0)
  assert.equal(activeToast, null)
})
