import { config } from './env';

/**
 * Builds the canonical public URL for private Cowatch room links.
 */
export function buildCowatchPublicUrl(
  baseUrl: string,
  shareSlugOrCode: string,
): string {
  const cleanBase =
    baseUrl.replace(
      /\/+$/,
      '',
    );

  const cleanSlug =
    shareSlugOrCode
      .trim()
      .replace(
        /^\/+/,
        '',
      );

  return `${cleanBase}/${cleanSlug}`;
}

export function getCowatchPublicUrl(
  shareSlugOrCode: string,
): string {
  return buildCowatchPublicUrl(
    config.cowatchPublicUrl,
    shareSlugOrCode,
  );
}