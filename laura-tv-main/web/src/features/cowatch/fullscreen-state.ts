import { cowatchUIConfig } from '../../config/cowatch-ui'

export const FULLSCREEN_OVERLAY_TIMEOUT_MS = cowatchUIConfig.fullscreenOverlayHideDelayMs

export const shouldHideFullscreenOverlay = (
  lastActivityAt: number,
  hovered: boolean,
  now = Date.now(),
  timeoutMs = FULLSCREEN_OVERLAY_TIMEOUT_MS,
) => !hovered && now - lastActivityAt >= timeoutMs

