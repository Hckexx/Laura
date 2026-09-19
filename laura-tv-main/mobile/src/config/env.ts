import { Platform } from 'react-native';

/**
 * LauraTV Mobile Environment & API Configuration
 */

const getDevCowatchUrl = () => {
  if (!__DEV__) {
    return 'https://laura-tv-copy-production.up.railway.app';
  }
  // On Android emulator, localhost is 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ibrax-server.onrender.com/api/v1',
  cowatchUrl: process.env.EXPO_PUBLIC_COWATCH_URL || getDevCowatchUrl(),
  cowatchPublicUrl: process.env.EXPO_PUBLIC_COWATCH_PUBLIC_URL || 'https://watch.theunfilteredgoose.in',

  tmdbImageBase: 'https://image.tmdb.org/t/p/w500',
  tmdbBackdropBase: 'https://image.tmdb.org/t/p/original',
  tmdbProfileBase: 'https://image.tmdb.org/t/p/w300',
  tmdbStillBase: 'https://image.tmdb.org/t/p/w400',
} as const;
