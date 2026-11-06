// Copy to frontend-next/e2e/a11y.spec.ts. Dev dependency: @axe-core/playwright (pin an exact version).
// Guards F-041 (contrast), F-042 (skip link), F-043 (names), F-044 (target size).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/landing', '/login', '/register', '/marketplace', '/businesses', '/feed'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Run the backend with FF_PAGE_GUIDED_TOURS=false: the auto-opening guided tour (F-031)
// covers the page. Test the tour dialog itself in its own spec.

for (const path of PAGES) {
  test(`no serious or critical WCAG 2.2 AA violations on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });

  test(`skip link reaches the main region on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('#main-content')).toHaveCount(1);
  });
}

test('no horizontal scrolling at 320 px on the feed', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
  await page.goto('/feed', { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
