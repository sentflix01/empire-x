/**
 * lib/frontendUrl.ts — Frontend URL helpers
 *
 * Parses FRONTEND_URL (comma-separated, supports wildcards) and exposes
 * typed helpers used by CORS config, email templates, and redirect URLs.
 */

const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

export function parseFrontendUrls(): string[] {
  const raw = process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL;
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeFrontendUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * Returns the first non-wildcard URL — used in email templates and
 * Stripe/Chapa return URLs.
 */
export function getPrimaryFrontendUrl(): string {
  const urls = parseFrontendUrls();
  if (!urls.length) return DEFAULT_FRONTEND_URL;
  const direct = urls.find((u) => !u.includes('*'));
  if (direct) {
    try { return normalizeFrontendUrl(direct); } catch { /* fall through */ }
  }
  return DEFAULT_FRONTEND_URL;
}

/** Returns all frontend origins (used for CORS). */
export function getFrontendOrigins(): string[] {
  return parseFrontendUrls();
}

module.exports = { parseFrontendUrls, getPrimaryFrontendUrl, getFrontendOrigins };
