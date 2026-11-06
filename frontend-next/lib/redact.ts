/**
 * lib/redact.ts — removes credentials from URLs before they reach error
 * tracking (audit F-015). Mirrors backend/lib/redact.ts.
 *
 * Guest order links (/order/<token>) and signed private-file links are
 * credentials: anyone who can read error reports must not be able to use them.
 */
export const REDACTED = '[REDACTED]';

const SECRET_PATH_PATTERNS: RegExp[] = [
  /(\/api\/direct-orders\/link\/)[^/?#]+/gi,
  /(\/order\/)[^/?#]+/gi,
  /(\/api\/private-files\/)[^?#]+/gi,
];

const SECRET_QUERY_KEYS = new Set([
  'token', 'access_token', 'refresh_token', 'id_token', 'signature', 'sig',
  'demo_asset', 'code', 'otp', 'password', 'secret', 'key', 'apikey', 'api_key',
]);

const SECRET_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];

/** Returns the URL with secret path segments and query values replaced; drops the fragment. */
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

type Loose = Record<string, unknown>;

/** Scrubs URLs in a Sentry breadcrumb in place (beforeBreadcrumb). */
export function scrubSentryBreadcrumb<T extends Loose>(crumb: T): T {
  const data = crumb.data as Loose | undefined;
  if (data) for (const k of ['url', 'from', 'to']) if (typeof data[k] === 'string') data[k] = redactUrl(data[k] as string);
  const c: Loose = crumb;
  if (typeof c.message === 'string') c.message = redactUrl(c.message);
  return crumb;
}

/** Scrubs a Sentry event in place (beforeSend / beforeSendTransaction). */
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
