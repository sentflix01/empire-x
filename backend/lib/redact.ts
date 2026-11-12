/**
 * lib/redact.ts — removes secrets from URLs before they are logged, stored in
 * error_events, or sent to Sentry (audit F-015).
 *
 * Some URLs carry a credential: guest order links (/link/<token>), private
 * file links (signature in the query), Demo asset tokens. Anyone who can read
 * logs or error tracking must not be able to use them.
 */
export const REDACTED = '[REDACTED]';

/** Path segments that are themselves credentials or private storage keys. */
const SECRET_PATH_PATTERNS: RegExp[] = [
  /(\/api\/direct-orders\/link\/)[^/?#]+/gi,   // guest order token
  /(\/order\/)[^/?#]+/gi,                        // frontend guest order page
  /(\/api\/private-files\/)[^?#]+/gi,            // private file key
];

/** Query parameters whose values must never be recorded. */
const SECRET_QUERY_KEYS = new Set([
  'token', 'access_token', 'refresh_token', 'id_token', 'signature', 'sig',
  'demo_asset', 'code', 'otp', 'password', 'secret', 'key', 'apikey', 'api_key',
]);

/** Returns the URL (absolute or relative) with secret path segments and query values replaced. */
export function redactUrl(url: string | null | undefined): string {
  if (typeof url !== 'string' || !url) return url ?? '';
  const hashIndex = url.indexOf('#');
  const withoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  let path = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : withoutHash.slice(queryIndex + 1);

  for (const pattern of SECRET_PATH_PATTERNS) path = path.replace(pattern, `$1${REDACTED}`);

  if (!query) return path;
  const redactedQuery = query.split('&').map((pair) => {
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    let key = rawKey;
    try { key = decodeURIComponent(rawKey); } catch { /* keep raw */ }
    return SECRET_QUERY_KEYS.has(key.toLowerCase()) ? `${rawKey}=${REDACTED}` : pair;
  }).join('&');
  return `${path}?${redactedQuery}`;
}

/** Path only (no query), redacted — for grouping and storing request paths. */
export function redactPath(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url) return null;
  return redactUrl(url).split('?')[0];
}

/** Headers that must not reach logs or error tracking. */
export const SECRET_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-jobs-secret'];

// ── Sentry ────────────────────────────────────────────────────────────────────

type Loose = Record<string, unknown>;

/** Scrubs a Sentry event or transaction in place and returns it (beforeSend / beforeSendTransaction). */
export function scrubSentryEvent<T extends Loose>(event: T): T {
  const request = event.request as Loose | undefined;
  if (request) {
    if (typeof request.url === 'string') request.url = redactUrl(request.url);
    if (typeof request.query_string === 'string') request.query_string = redactUrl(`?${request.query_string}`).slice(1);
    else if (request.query_string && typeof request.query_string === 'object') request.query_string = REDACTED;
    delete request.cookies;
    delete request.data;
    const headers = request.headers as Loose | undefined;
    if (headers) for (const h of Object.keys(headers)) if (SECRET_HEADERS.includes(h.toLowerCase())) headers[h] = REDACTED;
  }
  const e: Loose = event;
  if (typeof e.transaction === 'string') e.transaction = redactUrl(e.transaction);
  const breadcrumbs = event.breadcrumbs as Loose[] | undefined;
  if (Array.isArray(breadcrumbs)) breadcrumbs.forEach(scrubSentryBreadcrumb);
  const user = event.user as Loose | undefined;
  if (user) { delete user.email; delete user.ip_address; delete user.username; }
  return event;
}

/** Scrubs URLs in a breadcrumb in place and returns it (beforeBreadcrumb). */
export function scrubSentryBreadcrumb<T extends Loose>(crumb: T): T {
  const data = crumb.data as Loose | undefined;
  if (data) for (const k of ['url', 'from', 'to']) if (typeof data[k] === 'string') data[k] = redactUrl(data[k] as string);
  const c: Loose = crumb;
  if (typeof c.message === 'string') c.message = redactUrl(c.message);
  return crumb;
}
