/**
 * lib/publicPaths.ts — Route visibility policy
 *
 * GUEST ACCESS POLICY:
 *   Guests can browse read-only discovery pages.
 *   Write actions (post, like, comment, follow) prompt sign-up.
 *   Builder pages remain auth-gated at all times.
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
  '/choose-mode',   // always accessible — handles own auth check via AuthContext
  '/service-agreement',
  '/not-found',
  '/sitemap',
  '/robots',
  '/onboarding',
  // Guest-browsable discovery pages (read-only)
  '/feed',
  '/marketplace',
  '/businesses',
  '/showrooms',
  '/explore',
  '/events',
  '/jobs',
  '/courses',
  '/tasks',
  '/nearby',
]);

// Builder pages — auth-gated at all times
const SHOWROOM_BUILDER_PAGES = new Set([
  '/showroom/create',
  '/showroom/templates',
  '/showroom/samples',
  '/showroom/studio',
]);

// Pages that require login even if prefixes would otherwise match
const AUTH_ONLY_PREFIXES = [
  '/messages', '/notifications', '/settings', '/profile/edit',
  '/account', '/wallet', '/orders', '/cart', '/bookmarks',
  '/analytics', '/referral', '/coupons', '/mewacho', '/friends',
  '/scorecard',
];

export function isPublicPath(pathname: string): boolean {
  // Auth-only overrides everything
  if (AUTH_ONLY_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) return false;
  // Builder pages always gated
  if (SHOWROOM_BUILDER_PAGES.has(pathname)) return false;
  // Exact match
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Public prefixes
  if (pathname.startsWith('/p/')) return true;
  if (pathname.startsWith('/products/')) return true;
  if (pathname.startsWith('/profile/')) return true;
  if (pathname.startsWith('/showroom/')) return true;
  if (pathname.startsWith('/showrooms/')) return true;
  if (pathname.startsWith('/businesses/')) return true;
  if (pathname.startsWith('/events/')) return true;
  if (pathname.startsWith('/jobs/')) return true;
  if (pathname.startsWith('/courses/')) return true;
  if (pathname.startsWith('/tasks/')) return true;
  if (pathname.startsWith('/hashtag/')) return true;
  return false;
}

/** True when path is guest-browsable but write actions require sign-up */
export function isGuestBrowsablePath(pathname: string): boolean {
  return [
    '/feed', '/marketplace', '/businesses', '/showrooms',
    '/explore', '/events', '/jobs', '/courses', '/tasks', '/nearby',
  ].some(p => pathname === p) ||
    pathname.startsWith('/products/') ||
    pathname.startsWith('/showroom/') ||
    pathname.startsWith('/showrooms/') ||
    pathname.startsWith('/profile/') ||
    pathname.startsWith('/businesses/');
}
