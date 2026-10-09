import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicPath } from '@/lib/publicPaths';

/**
 * proxy.ts — Auth routing for Next.js 16+
 *
 * NOTE: In Next.js 16, this file MUST be named proxy.ts (not middleware.ts).
 * The convention was reversed — middleware.ts is deprecated, proxy.ts is the
 * active name that Next.js auto-invokes as edge middleware on every request.
 */

const AUTH_PAGES = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Non-sensitive hint cookie ("this browser may have a session") — the JWT
  // itself is never stored client-side (TD-014). Real verification happens
  // via the HttpOnly refresh cookie against the API.
  const isLoggedIn = request.cookies.get('nb_auth')?.value === '1';
  // A Demo cookie and the hint cookie look the same to this edge guard. Let a
  // Demo visitor open sign-in so they can authenticate their canonical Real
  // identity; the auth request explicitly clears Demo selectors server-side.
  const hasDemoSelector = request.cookies.has('demo_session') || request.cookies.has('demo_track1');
  const explicitlySwitchingToReal = request.nextUrl.searchParams.get('intent') === 'real';

  // Preserve old bookmarked chooser links while removing account selection from
  // the current one-identity registration and sign-in journey.
  if (pathname === '/choose-mode') {
    const target = new URL(request.nextUrl.searchParams.get('intent') === 'signup' ? '/register' : '/login', request.url);
    const returnTo = request.nextUrl.searchParams.get('return');
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) target.searchParams.set('return', returnTo);
    return NextResponse.redirect(target);
  }

  // Authenticated users on auth pages return to their workspace.
  if (isLoggedIn && AUTH_PAGES.has(pathname) && !hasDemoSelector && !explicitlySwitchingToReal) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  // Unauthenticated users on protected routes → login with return URL
  if (!isLoggedIn && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('return', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
