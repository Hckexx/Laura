import test from 'node:test'
import assert from 'node:assert/strict'
import { isInputTarget } from '../../hooks/useKeyboardShortcuts'

test('isInputTarget returns true for text inputs and textareas', () => {
  const dummyInput = {
    tagName: 'INPUT',
    isContentEditable: false,
    classList: { contains: () => false },
  } as unknown as HTMLElement

  const dummyTextArea = {
    tagName: 'TEXTAREA',
    isContentEditable: false,
    classList: { contains: () => false },
  } as unknown as HTMLElement

  assert.equal(isInputTarget(dummyInput), true)
  assert.equal(isInputTarget(dummyTextArea), true)
})

test('isInputTarget returns true for contenteditable elements and chat inputs', () => {
  const dummyContentEditable = {
    tagName: 'DIV',
    isContentEditable: true,
    classList: { contains: () => false },
  } as unknown as HTMLElement

  const dummyChatInput = {
    tagName: 'DIV',
    isContentEditable: false,
    classList: { contains: (cls: string) => cls === 'is-chat-input' },
  } as unknown as HTMLElement

  assert.equal(isInputTarget(dummyContentEditable), true)
  assert.equal(isInputTarget(dummyChatInput), true)
})

test('isInputTarget returns false for regular buttons, divs, and body', () => {
  const dummyButton = {
    tagName: 'BUTTON',
    isContentEditable: false,
    classList: { contains: () => false },
  } as unknown as HTMLElement

  const dummyDiv = {
    tagName: 'DIV',
    isContentEditable: false,
    classList: { contains: () => false },
  } as unknown as HTMLElement

  assert.equal(isInputTarget(dummyButton), false)
  assert.equal(isInputTarget(dummyDiv), false)
  assert.equal(isInputTarget(null), false)
})
