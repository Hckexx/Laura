// Reserved paths and slugs that cannot be claimed as custom room slugs
export const RESERVED_SLUGS = new Set([
  'home',
  'api',
  'cowatch',
  'watch-together',
  'movies',
  'movie',
  'tv',
  'tv-shows',
  'watch',
  'search',
  'discover',
  'watchlist',
  'profile',
  'room',
  'join',
  'health',
  'admin',
  'login',
  'auth',
  'settings',
  'about',
  'privacy',
  'terms',
  'assets',
  'static',
  'favicon',
  'robots',
  'sitemap',
]);

const ADJECTIVES = [
  'midnight', 'crimson', 'golden', 'velvet', 'cosmic', 'stellar', 'lunar', 'solar',
  'amber', 'emerald', 'sapphire', 'graphite', 'cinematic', 'serene', 'shadow', 'frost'
];

const NOUNS = [
  'lounge', 'cinema', 'theater', 'den', 'haven', 'sanctum', 'retreat', 'oasis',
  'studio', 'club', 'vault', 'room', 'space', 'orbit', 'parlor', 'suite'
];

/**
 * Normalizes a custom user slug. Returns null if invalid or reserved.
 */
export function normalizeShareSlug(rawSlug: string): string | null {
  if (typeof rawSlug !== 'string') return null;
  const trimmed = rawSlug.trim().toLowerCase();
  
  // Replace non-alphanumeric characters with single hyphens
  const cleaned = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (cleaned.length < 3 || cleaned.length > 48) {
    return null;
  }

  if (RESERVED_SLUGS.has(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Generates a readable, random share slug.
 */
export function generateRandomShareSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900); // 3 digit number
  return `${adj}-${noun}-${num}`;
}
