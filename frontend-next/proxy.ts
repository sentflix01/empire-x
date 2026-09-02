import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * proxy.ts — Auth routing for Next.js 16+
 */

const AUTH_PAGES = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]);

const PUBLIC_PATHS = new Set([
  '/',
  '/landing',
  '/login',
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

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/p/')) return true;
  if (pathname.startsWith('/products/')) return true;
  if (pathname.startsWith('/showroom/') && !SHOWROOM_BUILDER_PAGES.has(pathname)) return true;
  if (pathname.startsWith('/showrooms/')) return true;
  return false;
}

// Builder pages live under /showroom/* but remain auth-gated
// (only the public /showroom/[slug] viewer is anonymous)
const SHOWROOM_BUILDER_PAGES = new Set([
  '/showroom/create',
  '/showroom/templates',
  '/showroom/samples',
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
