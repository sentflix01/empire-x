import { test, expect } from '@playwright/test';

/**
 * Unknown URLs (audit F-036): a guest following a mistyped or retired link
 * gets the not-found page with status 404, not a sign-in redirect. Known
 * protected pages still send guests to sign-in.
 */
test('a guest on an unknown path sees the 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist', { waitUntil: 'load' });
  expect(response?.status()).toBe(404);
  expect(new URL(page.url()).pathname).toBe('/this-page-does-not-exist');
  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
});

test('a guest on a protected page is still sent to sign-in', async ({ page }) => {
  await page.goto('/orders', { waitUntil: 'load' });
  const url = new URL(page.url());
  expect(url.pathname).toBe('/login');
  expect(url.searchParams.get('return')).toBe('/orders');
});
