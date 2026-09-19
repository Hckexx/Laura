import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

export { ScreenOrientation };
export { OrientationLock } from 'expo-screen-orientation';

/**
 * Safely locks screen orientation with lifecycle guards.
 * Catches and absorbs expected Android Activity lifecycle rejections
 * (e.g. "The current activity is no longer available", "Activity is destroyed").
 */
export async function safeLockOrientation(
  orientation: ScreenOrientation.OrientationLock,
  isMounted?: () => boolean,
): Promise<void> {
  if (isMounted && !isMounted()) {
    return;
  }

  try {
    await ScreenOrientation.lockAsync(orientation);
  } catch (error: any) {
    const message = error?.message ? String(error.message) : String(error);
    if (
      message.includes('activity is no longer available') ||
      message.includes('Activity is destroyed') ||
      message.includes('Current activity is null') ||
      message.includes('rejected')
    ) {
      // Expected Android Activity lifecycle race condition during screen unmount/transition
      return;
    }
    // Log unexpected orientation errors for debugging without unhandled rejection
    console.warn('[ScreenOrientation] lockAsync caught non-fatal error:', message);
  }
}

/**
 * Safely unlocks screen orientation with lifecycle guards.
 */
export async function safeUnlockOrientation(isMounted?: () => boolean): Promise<void> {
  if (isMounted && !isMounted()) {
    return;
  }

  try {
    await ScreenOrientation.unlockAsync();
  } catch (error: any) {
    const message = error?.message ? String(error.message) : String(error);
    if (
      message.includes('activity is no longer available') ||
      message.includes('Activity is destroyed') ||
      message.includes('Current activity is null') ||
      message.includes('rejected')
    ) {
      return;
    }
    console.warn('[ScreenOrientation] unlockAsync caught non-fatal error:', message);
  }
}

/**
 * Safely enters or exits true immersive fullscreen on Android.
 * Hides the Android system navigation bar in fullscreen and restores it on exit.
 */
export async function safeSetImmersiveFullscreen(
  enable: boolean,
  isMounted?: () => boolean,
): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (isMounted && !isMounted()) return;

  try {
    if (enable) {
      await NavigationBar.setVisibilityAsync('hidden');
    } else {
      await NavigationBar.setVisibilityAsync('visible');
    }
  } catch (error: any) {
    const message = error?.message ? String(error.message) : String(error);
    if (
      message.includes('activity is no longer available') ||
      message.includes('Activity is destroyed') ||
      message.includes('Current activity is null') ||
      message.includes('rejected')
    ) {
      return;
    }
    console.warn('[NavigationBar] setVisibilityAsync error:', message);
  }
}
