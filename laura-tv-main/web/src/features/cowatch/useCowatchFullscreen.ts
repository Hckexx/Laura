import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { FULLSCREEN_OVERLAY_TIMEOUT_MS, shouldHideFullscreenOverlay } from './fullscreen-state'

export function useCowatchFullscreen(containerRef: RefObject<HTMLDivElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [overlaysVisible, setOverlaysVisible] = useState(true)
  const lastActivityAtRef = useRef(0)
  const hoveredRef = useRef(false)
  const hideTimerRef = useRef<number | undefined>(undefined)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== undefined) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = undefined
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()
    if (!document.fullscreenElement || hoveredRef.current) return
    hideTimerRef.current = window.setTimeout(() => {
      if (shouldHideFullscreenOverlay(lastActivityAtRef.current, hoveredRef.current)) setOverlaysVisible(false)
    }, FULLSCREEN_OVERLAY_TIMEOUT_MS)
  }, [clearHideTimer])

  const showOverlays = useCallback(() => {
    lastActivityAtRef.current = Date.now()
    setOverlaysVisible(true)
    scheduleHide()
  }, [scheduleHide])

  const setOverlayHovered = useCallback((hovered: boolean) => {
    hoveredRef.current = hovered
    if (hovered) {
      clearHideTimer()
      setOverlaysVisible(true)
    } else {
      lastActivityAtRef.current = Date.now()
      scheduleHide()
    }
  }, [clearHideTimer, scheduleHide])

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await containerRef.current?.requestFullscreen()
  }, [containerRef])

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === containerRef.current
      setIsFullscreen(active)
      setOverlaysVisible(true)
      lastActivityAtRef.current = Date.now()
      if (active) scheduleHide()
      else clearHideTimer()
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      clearHideTimer()
    }
  }, [clearHideTimer, containerRef, scheduleHide])

  return { isFullscreen, overlaysVisible, showOverlays, setOverlayHovered, toggleFullscreen }
}
