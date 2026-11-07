import { test, expect } from '@playwright/test';

/**
 * Small accessibility gaps from audit F-044:
 * - WCAG 1.4.10 Reflow: no sideways scrolling at 320 px wide (the guest header was 3 px too wide);
 * - WCAG 2.5.8 Target Size: the show-password button is at least 24 x 24 px;
 * - forced colours (Windows high contrast): the primary button keeps a visible border.
 */
for (const path of ['/feed', '/marketplace', '/businesses']) {
  test(`${path} does not scroll sideways at 320 px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path, { waitUntil: 'networkidle' });
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    await expect(page.getByRole('link', { name: 'Back to landing page' })).toBeVisible();
  });
}

for (const path of ['/login', '/register']) {
  test(`${path}: the show-password button is a usable target`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    const box = await page.getByRole('button', { name: 'Show password' }).first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
  });
}

test('the Sign in button keeps a border in forced-colours mode', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/login', { waitUntil: 'load' });
  const width = await page.getByRole('button', { name: 'Sign in', exact: true })
    .evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
  expect(width).toBeGreaterThanOrEqual(1);
});
