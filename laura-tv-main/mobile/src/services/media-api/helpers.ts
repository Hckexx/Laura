import { config } from '../../config/env';
import type { VideoItem } from '../../types/media';

// Helper to build poster URL
export function getPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) return null;
  return `${config.tmdbImageBase}${posterPath}`;
}

// Helper to build backdrop URL
export function getBackdropUrl(backdropPath: string | null | undefined): string | null {
  if (!backdropPath) return null;
  return `${config.tmdbBackdropBase}${backdropPath}`;
}

// Helper to build profile picture URL (for cast)
export function getProfileUrl(profilePath: string | null | undefined): string | null {
  if (!profilePath) return null;
  return `${config.tmdbProfileBase}${profilePath}`;
}

// Helper to build episode still preview URL
export function getStillUrl(stillPath: string | null | undefined): string | null {
  if (!stillPath) return null;
  return `${config.tmdbStillBase}${stillPath}`;
}

// Get the best trailer key from videos array
export function getTrailerKey(videos?: VideoItem[]): string | null {
  if (!videos || videos.length === 0) return null;

  return (
    videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official)?.key ||
    videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube')?.key ||
    videos.find((v) => v.type === 'Teaser' && v.site === 'YouTube' && v.official)?.key ||
    videos.find((v) => v.site === 'YouTube')?.key ||
    null
  );
}
