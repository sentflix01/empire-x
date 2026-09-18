import { describe, expect, it } from 'vitest';
import { isPublicPath } from '@/lib/publicPaths';

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
    '/p/public-profile',
    '/products/public-product',
    '/showroom/public-showroom',
    '/showrooms/public-showroom',
  ])('allows anonymous access to %s', (pathname) => {
    expect(isPublicPath(pathname)).toBe(true);
  });

  it.each([
    '/feed',
    '/wallet',
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
