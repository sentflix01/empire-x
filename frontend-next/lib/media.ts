/**
 * Convert media saved by older deployments into a URL that the current browser
 * can load.  Older records can contain a localhost origin or a root-relative
 * /uploads path; neither is reachable from a user's phone in production.
 */
export function resolveMediaUrl(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || !raw.trim()) return null;

  const url = raw.trim();
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
  if (!apiBase) return url;

  if (url.startsWith('/uploads/')) return `${apiBase}${url}`;

  try {
    const parsed = new URL(url);
    const isLocalOrigin = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    if (isLocalOrigin && parsed.pathname.startsWith('/uploads/')) {
      return `${apiBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Leave unrecognised legacy values alone so the image fallback can handle them.
  }

  return url;
}

// Hosts the Next.js image optimizer refuses (SSRF protection), e.g. local
// development uploads on http://localhost:3001.
const PRIVATE_HOST = /^(?:localhost|.+\.localhost|0\.0\.0\.0|\[?::1\]?|127(?:\.\d+){3}|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2})$/;

/**
 * Whether next/image may resize and re-encode this image (WebP/AVIF at the
 * displayed size). Uploads are stored as the original photo, often ~1 MB,
 * so serving them unresized costs phones megabytes per page (performance
 * audit 2026-11-09). Returns false for what the optimizer cannot or should not
 * handle — data/blob URLs, SVG, plain http, and local or private hosts — so
 * those keep loading directly as before.
 */
export function canOptimizeImage(src: string | null | undefined): boolean {
  if (!src) return false;
  if (src.startsWith('data:') || src.startsWith('blob:')) return false;
  if (/\.svg(?:[?#]|$)/i.test(src)) return false;
  if (src.startsWith('/')) return !src.startsWith('//');
  try {
    const { protocol, hostname } = new URL(src);
    return protocol === 'https:' && !PRIVATE_HOST.test(hostname) && !hostname.endsWith('.local');
  } catch {
    return false;
  }
}
