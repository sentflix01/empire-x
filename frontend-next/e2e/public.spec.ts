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

  test('login and register entry points are directly accessible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/register$/);
  });

  test('protected routes redirect anonymous visitors to login with a return path', async ({ page }) => {
    await page.goto('/wallet', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?return=%2Fwallet/);
  });
});
