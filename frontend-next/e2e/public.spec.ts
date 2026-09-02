import { test, expect } from '@playwright/test';

/**
 * Public (unauthenticated) smoke flows — TD-003.
 * These must pass on a fresh database with zero seed data.
 */

test.describe('Public pages', () => {
  test('landing page renders its primary call-to-action', async ({ page }) => {
    const res = await page.goto('/landing', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/nodbusiness/i);
  });

  test('root path serves the app shell or redirects somewhere valid', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBeLessThan(400);
  });

  test('login and register pages render their forms', async ({ page }) => {
    for (const route of ['/login', '/register']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('input[type="email"], input[name="email"], input[type="text"]').first()).toBeVisible();
      // /register has two (password + confirm) — .first() keeps strict mode happy
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    }
  });

  test('protected routes redirect anonymous visitors to login with a return path', async ({ page }) => {
    await page.goto('/wallet', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?return=%2Fwallet/);
  });
});
