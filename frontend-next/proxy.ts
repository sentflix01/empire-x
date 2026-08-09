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
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/landing',
  '/',
]);

// Builder pages live under /showroom/* but remain auth-gated
// (only the public /showroom/[slug] viewer is anonymous)
const SHOWROOM_BUILDER_PAGES = new Set([
  '/showroom/create',
  '/showroom/templates',
  '/showroom/samples',
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/showrooms/')) return true;
  if (pathname.startsWith('/showroom/') && !SHOWROOM_BUILDER_PAGES.has(pathname)) return true;
  if (pathname.startsWith('/products/')) return true;
  if (pathname.startsWith('/p/')) return true;
  return false;
}

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

  const token = request.cookies.get('access_token')?.value;
  const isLoggedIn = !!token;

  // Authenticated users on auth pages → feed
  if (isLoggedIn && AUTH_PAGES.has(pathname)) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  // Unauthenticated users on protected routes → login
  if (!isLoggedIn && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|images).*)',
  ],
};
