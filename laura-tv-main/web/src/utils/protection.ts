const isMobileOrTouchDevice = () => {
  const coarsePointer =
    window.matchMedia?.('(pointer: coarse)').matches ?? false

  const noHover =
    window.matchMedia?.('(hover: none)').matches ?? false

  const touchCapable =
    navigator.maxTouchPoints > 0 ||
    'ontouchstart' in window

  const mobileUserAgent =
    /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )

  /*
   * Mobile browsers frequently have large differences between
   * outerHeight/innerHeight because of address bars, browser chrome,
   * safe areas, keyboards, etc.
   *
   * DevTools detection must never run on these devices.
   */
  return (
    mobileUserAgent ||
    touchCapable ||
    coarsePointer ||
    noHover
  )
}

export function initDevToolsProtection() {
  /*
   * This protection is only a lightweight desktop deterrent.
   * It is NOT a security boundary.
   *
   * Mobile and touch devices are intentionally excluded because
   * viewport-based DevTools detection is unreliable there.
   */
  if (isMobileOrTouchDevice()) {
    return
  }

  let devToolsBlocked = false

  const blockKeys = (event: KeyboardEvent) => {
    const key =
      event.key.toLowerCase()

    const devToolsShortcut =
      key === 'f12' ||
      (
        event.ctrlKey &&
        event.shiftKey &&
        ['i', 'j', 'c'].includes(key)
      ) ||
      (
        event.metaKey &&
        event.altKey &&
        ['i', 'j', 'c'].includes(key)
      )

    const sourceShortcut =
      (
        event.ctrlKey &&
        key === 'u'
      ) ||
      (
        event.metaKey &&
        key === 'u'
      )

    if (
      devToolsShortcut ||
      sourceShortcut
    ) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      return false
    }
  }

  document.addEventListener(
    'keydown',
    blockKeys,
    true,
  )

  window.addEventListener(
    'keydown',
    blockKeys,
    true,
  )

  const blockContextMenu = (
    event: MouseEvent,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    return false
  }

  document.addEventListener(
    'contextmenu',
    blockContextMenu,
    true,
  )

  /*
   * Keep ordinary browser functionality intact.
   *
   * Do NOT block:
   * - F5 / refresh
   * - F11 / fullscreen
   * - printing
   * - saving
   * - drag
   * - text selection
   *
   * Those are normal browser features and are unrelated to DevTools.
   */

  const showBlockedOverlay = () => {
    if (
      devToolsBlocked ||
      document.getElementById(
        'lauratv-devtools-overlay',
      )
    ) {
      return
    }

    devToolsBlocked = true

    const overlay =
      document.createElement('div')

    overlay.id =
      'lauratv-devtools-overlay'

    overlay.setAttribute(
      'role',
      'alert',
    )

    Object.assign(
      overlay.style,
      {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'rgba(7, 8, 10, 0.98)',
        color: '#f5f1e8',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        textAlign: 'center',
      },
    )

    const panel =
      document.createElement('div')

    Object.assign(
      panel.style,
      {
        maxWidth: '420px',
      },
    )

    const title =
      document.createElement('div')

    title.textContent =
      'Developer tools detected'

    Object.assign(
      title.style,
      {
        marginBottom: '10px',
        fontSize: '20px',
        fontWeight: '700',
      },
    )

    const message =
      document.createElement('div')

    message.textContent =
      'Close developer tools to continue using LauraTV.'

    Object.assign(
      message.style,
      {
        color:
          'rgba(245, 241, 232, 0.68)',
        fontSize: '14px',
        lineHeight: '1.6',
      },
    )

    panel.append(
      title,
      message,
    )

    overlay.appendChild(
      panel,
    )

    document.body.appendChild(
      overlay,
    )
  }

  const hideBlockedOverlay = () => {
    const overlay =
      document.getElementById(
        'lauratv-devtools-overlay',
      )

    if (overlay) {
      overlay.remove()
    }

    devToolsBlocked = false
  }

  const detectDevTools =
    () => {
      /*
       * Re-check in case the browser changes into a touch/mobile-like
       * mode after startup. Never penalize such a viewport.
       */
      if (
        isMobileOrTouchDevice()
      ) {
        hideBlockedOverlay()
        return
      }

      /*
       * Desktop docked DevTools generally produce a substantial
       * outer-vs-inner viewport difference.
       *
       * Use a much larger threshold than the previous 100px to reduce
       * false positives caused by desktop browser chrome.
       */
      const widthDifference =
        Math.abs(
          window.outerWidth -
            window.innerWidth,
        )

      const heightDifference =
        Math.abs(
          window.outerHeight -
            window.innerHeight,
        )

      const widthThreshold =
        220

      const heightThreshold =
        220

      const detected =
        widthDifference >
          widthThreshold ||
        heightDifference >
          heightThreshold

      if (detected) {
        showBlockedOverlay()
      } else {
        hideBlockedOverlay()
      }
    }

  /*
   * Check periodically.
   *
   * Do not use debugger timing or console timing. Those techniques are
   * noisy, unreliable across browsers, and can freeze or break real users.
   */
  const intervalId =
    window.setInterval(
      detectDevTools,
      1000,
    )

  window.addEventListener(
    'resize',
    detectDevTools,
    {
      passive: true,
    },
  )

  detectDevTools()

  /*
   * Return an optional cleanup function so the implementation is safe
   * to reuse in tests or future lifecycle-managed code.
   */
  return () => {
    window.clearInterval(
      intervalId,
    )

    window.removeEventListener(
      'resize',
      detectDevTools,
    )

    document.removeEventListener(
      'keydown',
      blockKeys,
      true,
    )

    window.removeEventListener(
      'keydown',
      blockKeys,
      true,
    )

    document.removeEventListener(
      'contextmenu',
      blockContextMenu,
      true,
    )

    hideBlockedOverlay()
  }
}