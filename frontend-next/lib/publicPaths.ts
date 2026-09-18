/**
 * lib/publicPaths.ts — Route visibility policy
 *
 * Extracted from middleware.ts so it can be imported by both the
 * Next.js edge middleware AND unit tests (middleware.ts itself cannot
 * be imported as a module from test code because it depends on the
 * Next.js runtime request/response types).
 */

const PUBLIC_PATHS = new Set([
  '/',
  '/landing',
  '/login',
  '/auth/google/callback',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/choose-account',
  '/service-agreement',
  '/not-found',
  '/sitemap',
  '/robots',
  '/onboarding',
]);

// Builder pages live under /showroom/* but remain auth-gated.
// Only the public viewer (/showroom/[slug]) is anonymous.
const SHOWROOM_BUILDER_PAGES = new Set([
  '/showroom/create',
  '/showroom/templates',
  '/showroom/samples',
]);

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/p/')) return true;
  if (pathname.startsWith('/products/')) return true;
  if (pathname.startsWith('/showroom/') && !SHOWROOM_BUILDER_PAGES.has(pathname)) return true;
  if (pathname.startsWith('/showrooms/')) return true;
  return false;
}
