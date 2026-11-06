import { test, expect } from '@playwright/test';

/**
 * Skip link and page landmarks (audit F-042, WCAG 2.4.1 Bypass Blocks,
 * 1.3.1 Info and Relationships): every page has one <main id="main-content">
 * that the skip link moves focus to, and at least one <h1>.
 * Pages that need no seeded data, plus the seeded E2E showroom when present.
 */
const PAGES = ['/landing', '/login', '/register', '/forgot-password', '/service-agreement', '/marketplace', '/feed', '/businesses', '/offline', '/no-such-page'];

for (const path of PAGES) {
  test(`${path} has a skip-link target, one main landmark and a heading`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1').first()).toBeAttached();

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
  });
}

test('a public showroom without a hero still has an h1', async ({ page }) => {
  const res = await page.goto('/showroom/e2e-coffee-house', { waitUntil: 'load' });
  test.skip(!res || res.status() >= 400, 'E2E showroom not seeded');
  await expect(page.locator('main#main-content')).toHaveCount(1);
  await expect(page.locator('h1').first()).toBeAttached();
});
