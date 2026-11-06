import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPublicPath, requiresSignIn, SIGN_IN_ROOTS } from '@/lib/publicPaths';

/** Every page route in app/, with route groups removed and [params] filled in. */
function appPages(dir = path.join(__dirname, '..', 'app'), prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      if (entry.name === 'page.tsx') out.push(prefix || '/');
      continue;
    }
    const segment = /^\(.*\)$/.test(entry.name) ? '' : `/${entry.name.replace(/^\[.*\]$/, 'sample-id')}`;
    out.push(...appPages(path.join(dir, entry.name), prefix + segment));
  }
  return out;
}

describe('public route policy', () => {
  it.each([
    '/',
    '/landing',
    '/login',
    '/auth/google/callback',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/choose-account',
    '/service-agreement',
    '/feed',
    '/offline',
    '/p/public-profile',
    '/products/public-product',
    '/showroom/public-showroom',
    '/showrooms/public-showroom',
  ])('allows anonymous access to %s', (pathname) => {
    expect(isPublicPath(pathname)).toBe(true);
  });

  it.each([
    '/wallet',
    '/products/create',
    '/products/edit',
    '/products/edit/abc',
    '/products/scan',
    '/service-agreement/manage',
    '/auth/google',
    '/auth/google/callback/manage',
  ])(
    'keeps %s protected',
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false);
    },
  );
});

describe('guests and unknown paths (audit F-036)', () => {
  it.each([
    '/this-page-does-not-exist',
    '/wp-admin',
    '/auth/google',
    '/service-agreement/manage',
    '/opengraph-image',
  ])('lets %s reach not-found instead of sign-in', (pathname) => {
    expect(requiresSignIn(pathname)).toBe(false);
  });

  it.each([
    '/wallet', '/orders', '/orders/success', '/messages/abc', '/products/create', '/products/scan',
    '/profile/edit', '/showroom/create', '/business/edit', '/admin/devops', '/settings',
  ])('still sends guests from %s to sign-in', (pathname) => {
    expect(requiresSignIn(pathname)).toBe(true);
  });

  it('classifies every page in app/ as public or sign-in only', () => {
    const pages = appPages();
    expect(pages.length).toBeGreaterThan(40);
    const unclassified = pages.filter((p) => !isPublicPath(p) && !SIGN_IN_ROOTS.has(p.split('/')[1]));
    expect(unclassified).toEqual([]);
  });
});
