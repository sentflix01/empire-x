import { test, expect } from '@playwright/test';

/**
 * A published site saved without sections (showrooms.sections is NULL) must
 * still open. JSON.parse(null) is null, so the page used to crash on
 * sections.find (lib/showroomSectionsCodec.ts sectionList).
 */
test('a site with no saved sections still opens', async ({ page }) => {
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/**', (r) => r.fulfill(json([])));
  await page.route('**/api/products*', (r) => r.fulfill(json({ items: [], products: [], next_cursor: null })));
  await page.route('**/api/showrooms/slug/e2e-empty-site', (r) => r.fulfill(json({
    id: '00000000-0000-4000-8000-0000000000d2', owner_id: '00000000-0000-4000-8000-0000000000d1',
    title: 'Empty Sections Cafe', description: 'A site saved before sections existed', slug: 'e2e-empty-site',
    category: 'food', sections: null, status: 'published', theme_color: null, logo_url: null, view_count: 0,
  })));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/showroom/e2e-empty-site');
  await expect(page.getByText('Empty Sections Cafe').first()).toBeVisible({ timeout: 20_000 });
  expect(errors.filter((m) => /find|sections|null/i.test(m))).toEqual([]);
});
