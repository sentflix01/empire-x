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
