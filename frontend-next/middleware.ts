/**
 * middleware.ts — Server-side route gating.
 *
 * Uses the NON-SENSITIVE `nb_auth` hint cookie to decide whether the browser
 * may hold a session. The real JWT is HttpOnly and invisible to JS/middleware.
 *
 * Public routes:  /, /landing, /login, /register, /forgot-password,
 *                 /reset-password, /p/*, /showroom/*, /showrooms/*
 * Protected:      everything else (the (app) route group)
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/landing',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/choose-account',
  '/not-found',
  '/sitemap',
  '/robots',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/p/')) return true;
  if (pathname.startsWith('/showroom/')) return true;
  if (pathname.startsWith('/showrooms')) return true;
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/favicon')) return true;
  if (pathname.includes('.')) return true; // static files
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get('nb_auth')?.value === '1';

  // Auth pages — if user already has a session, redirect to feed
  if (pathname === '/login' || pathname === '/register') {
    if (hasSession) {
      const feedUrl = request.nextUrl.clone();
      feedUrl.pathname = '/feed';
      return NextResponse.redirect(feedUrl);
    }
    return NextResponse.next();
  }

  // Public pages — always allow
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protected pages — require session hint
  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('return', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser icon)
     * - public files (robots.txt, sitemap, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
