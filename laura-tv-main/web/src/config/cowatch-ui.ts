export interface CowatchUIConfig {
  chatPanelOpacity: number
  chatPanelBackdropBlurPx: number
  chatPanelDefaultOpen: boolean
  fullscreenOverlayHideDelayMs: number
  showLocalPreviewInFullscreen: boolean
}

export const cowatchUIConfig: CowatchUIConfig = {
  chatPanelOpacity: 0.85,
  chatPanelBackdropBlurPx: 12,
  chatPanelDefaultOpen: true,
  fullscreenOverlayHideDelayMs: 2_500,
  showLocalPreviewInFullscreen: true,
}
