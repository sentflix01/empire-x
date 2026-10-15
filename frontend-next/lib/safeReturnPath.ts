/**
 * Returns `raw` only when it is a same-origin path, otherwise `fallback`.
 *
 * `startsWith('/') && !startsWith('//')` is not enough: browsers treat `\` as
 * `/` and drop tabs/newlines while parsing, so `/\evil.com` and `/%09/evil.com`
 * both resolve to `//evil.com`. Resolve the path against a fixed origin and
 * keep it only if the origin is unchanged.
 */
const PROBE_ORIGIN = 'http://return-path.invalid';

export function safeReturnPath(raw: string | null | undefined, fallback = '/feed'): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  // Backslashes and control characters have no place in an app path.
  if ([...raw].some((ch) => ch === '\\' || ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f)) return fallback;
  try {
    const url = new URL(raw, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
