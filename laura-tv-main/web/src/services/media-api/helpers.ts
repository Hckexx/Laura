const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

// Helper to build poster URL
export function getPosterUrl(posterPath: string | null) {
  if (!posterPath) return null
  return `${TMDB_IMAGE_BASE}${posterPath}`
}

// Helper to build backdrop URL
export function getBackdropUrl(backdropPath: string | null) {
  if (!backdropPath) return null
  return `https://image.tmdb.org/t/p/original${backdropPath}`
}

// Get the best trailer key from videos array
export function getTrailerKey(videos: any[]) {
  if (!videos || videos.length === 0) return null
  
  return (
    videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube' && v.official)?.key ||
    videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key ||
    videos.find((v: any) => v.type === 'Teaser' && v.site === 'YouTube' && v.official)?.key ||
    videos.find((v: any) => v.site === 'YouTube')?.key ||
    null
  )
}
