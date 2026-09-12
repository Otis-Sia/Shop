/**
 * Image sanitization and validation utilities for Meta Commerce Catalog,
 * Google Merchant Feed, and AI auto-discovery.
 */

// Hostnames and domain patterns that reject crawlers, return HTML redirect pages, or require authentication
const BLOCKED_HOST_PATTERNS = [
  'lookaside.fbsbx.com',
  'lookaside.instagram.com',
  'attachment.fbsbx.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'pinterest.com',
  'twitter.com',
  'x.com',
  'threads.net',
  'youtube.com',
  'youtu.be',
];

// Query and path patterns that indicate crawler traps or non-image HTML responses
const BLOCKED_SUBSTRING_PATTERNS = [
  'lookaside/crawler/media',
  'crawler/?media_id',
  'from_lookaside=',
  'media_id=',
  'tv-it.com/storage/nermeen-aladin',
];

/**
 * Validates if an image URL is publicly accessible and safe for catalog crawlers (Meta, Google).
 */
export function isValidCatalogImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    const search = parsed.search.toLowerCase();

    // Check blocked hostnames
    if (BLOCKED_HOST_PATTERNS.some(blocked => hostname === blocked || hostname.endsWith(`.${blocked}`))) {
      return false;
    }

    // Check blocked path/query substrings
    const fullUrlLower = trimmed.toLowerCase();
    if (BLOCKED_SUBSTRING_PATTERNS.some(pattern => fullUrlLower.includes(pattern))) {
      return false;
    }

    // Reject HTML or document extensions
    if (pathname.endsWith('.html') || pathname.endsWith('.htm') || pathname.endsWith('.php')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Filters and sanitizes an array of image URLs to guarantee only clean, crawlable URLs are sent to Meta/Google.
 */
export function sanitizeCatalogImageUrls(urls: (string | null | undefined)[]): string[] {
  if (!Array.isArray(urls)) return [];
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const raw of urls) {
    if (isValidCatalogImageUrl(raw)) {
      const clean = raw!.trim();
      if (!seen.has(clean)) {
        seen.add(clean);
        sanitized.push(clean);
      }
    }
  }

  return sanitized;
}
