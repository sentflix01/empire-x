import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicPath } from '@/lib/publicPaths';

/**
 * middleware.ts — Auth routing for Next.js 16+
 *
 * NOTE: This file MUST be named middleware.ts (not proxy.ts or anything else)
 * for Next.js to auto-invoke it as edge middleware on every request.
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

  // Authenticated users on auth pages → feed
  if (isLoggedIn && AUTH_PAGES.has(pathname)) {
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
