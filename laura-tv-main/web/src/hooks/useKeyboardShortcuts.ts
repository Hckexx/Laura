import { useEffect } from 'react';

export interface ShortcutHandlers {
  onToggleFullscreen?: () => void;
  onToggleChat?: () => void;
  onTogglePeople?: () => void;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
}

/**
 * Checks if the currently active / event target element is an editable input.
 */
export function isInputTarget(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as any;
  const tagName = typeof el.tagName === 'string' ? el.tagName.toLowerCase() : '';
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (el.isContentEditable || (typeof el.getAttribute === 'function' && el.getAttribute('contenteditable') === 'true')) {
    return true;
  }
  if (typeof el.closest === 'function' && el.closest('input, textarea, select, [contenteditable="true"], .is-chat-input')) {
    return true;
  }
  if (typeof el.classList?.contains === 'function' && el.classList.contains('is-chat-input')) {
    return true;
  }
  return false;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Search shortcut (Ctrl+K or Cmd+K) - works even if not in input or when focused
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        handlers.onSearch?.();
        return;
      }

      // 2. Escape shortcut
      if (event.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      // 3. Strict Input Guard: Ignore single-letter shortcuts when typing inside form elements
      if (isInputTarget(event.target) || (typeof document !== 'undefined' && isInputTarget(document.activeElement))) {
        return;
      }

      // Ignore when modifiers like Alt, Ctrl, or Meta are held (except plain Shift)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();
      switch (key) {
        case 'f':
          event.preventDefault();
          handlers.onToggleFullscreen?.();
          break;
        case 'c':
          event.preventDefault();
          handlers.onToggleChat?.();
          break;
        case 'p':
          event.preventDefault();
          handlers.onTogglePeople?.();
          break;
        case 'm':
          event.preventDefault();
          handlers.onToggleMic?.();
          break;
        case 'v':
          event.preventDefault();
          handlers.onToggleCam?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
}
