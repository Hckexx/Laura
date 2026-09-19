export type ShareNavigator = Pick<Navigator, 'clipboard'> & Partial<Pick<Navigator, 'share'>>

export async function copyText(navigatorApi: ShareNavigator, text: string): Promise<void> {
  if (!navigatorApi.clipboard?.writeText) throw new Error('Clipboard access is unavailable.')
  await navigatorApi.clipboard.writeText(text)
}

export function isShareCancellation(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')
}

export async function shareRoomInvite(navigatorApi: ShareNavigator, shareUrl: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (!navigatorApi.share) {
    await copyText(navigatorApi, shareUrl)
    return 'copied'
  }

  try {
    await navigatorApi.share({
      title: 'Watch Together on LauraTV',
      text: 'Join my private LauraTV room.',
      url: shareUrl,
    })
    return 'shared'
  } catch (error) {
    if (isShareCancellation(error)) return 'cancelled'
    await copyText(navigatorApi, shareUrl)
    return 'copied'
  }
}
