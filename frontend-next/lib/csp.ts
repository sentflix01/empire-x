/**
 * lib/csp.ts — the Content-Security-Policy for pages (audit F-016).
 *
 * Scripts need a per-request nonce instead of 'unsafe-inline': an injected
 * <script> or event handler (as in F-057) cannot run. proxy.ts creates the
 * nonce, sends this policy, and Next.js adds the nonce to its own scripts.
 * 'strict-dynamic' lets those scripts load further scripts (route chunks,
 * Google sign-in); the host list is a fallback for older browsers. Stripe is
 * used only through redirects to its hosted checkout page, so its in-page
 * script, API and frames are not allowed (audit F-052).
 */
export interface CspOptions {
  nonce: string;
  isDev: boolean;
  apiHost: string;
}

const SCRIPT_HOSTS = 'https://accounts.google.com https://browser.sentry-cdn.com';

export function buildCsp({ nonce, isDev, apiHost }: CspOptions): string {
  // https → wss (production), http → ws (local backends on any port).
  const wsHost = apiHost.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${SCRIPT_HOSTS}${isDev ? ` 'unsafe-eval'` : ''}`,
    // Inline styles stay allowed: React style attributes cannot carry a nonce.
    `style-src 'self' 'unsafe-inline' https://accounts.google.com https://unpkg.com https://cdnjs.cloudflare.com`,
    // Any HTTPS image: product photos and avatars come from storage and import
    // sources that cannot be listed in advance. Images cannot run code.
    `img-src 'self' data: blob: https: http://localhost:3001 http://localhost:3002`,
    `font-src 'self'`,
    `connect-src 'self' ${apiHost} ${wsHost} ws://localhost:3001 wss://localhost:3001 https://*.sentry.io https://api.chapa.co https://accounts.google.com https://*.supabase.co https://*.supabase.in`,
    // Google Sign-In; website Video (YouTube) and Map / Live location sections
    `frame-src https://accounts.google.com https://www.youtube-nocookie.com https://www.youtube.com https://www.google.com https://maps.google.com https://www.openstreetmap.org`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
    // Upgrade to https only when the API is https. Safari/WebKit also upgrades
    // http://localhost, which broke every API call on a local http backend.
    apiHost.startsWith('https:') ? `upgrade-insecure-requests` : '',
  ].filter(Boolean).join('; ');
}

/** A fresh base64 nonce (128 bits). Works in the edge and Node runtimes. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
