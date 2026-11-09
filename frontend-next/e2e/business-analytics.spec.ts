import { test, expect, type Page } from '@playwright/test';

/**
 * Business Analytics with the API answered in the browser:
 * - revenue adds order totals that arrive as decimal strings (it once showed
 *   "0100.00250.00 ETB");
 * - products show Saves (bookmarks), counted from /api/saves/my-products;
 * - choosing a business stays on /analytics (it once went to a missing page).
 */
const SELLER = '00000000-0000-4000-8000-0000000000a1';
const BIZ = '00000000-0000-4000-8000-0000000000b1';
const PRODUCT = '00000000-0000-4000-8000-0000000000c1';
const today = new Date().toISOString();

async function mockApi(page: Page) {
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/**', (r) => r.fulfill(json([])));
  await page.route('**/api/auth/refresh', (r) => r.fulfill(json({ access_token: 'e2e-token' })));
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ id: SELLER, full_name: 'Test Seller', role: 'user', onboarding_completed: true })));
  await page.route('**/api/profiles?*', (r) => r.fulfill(json([{ id: 'prof', user_id: SELLER, display_name: 'Test Seller', profile_type: 'business' }])));
  await page.route('**/api/businesses?*', (r) => r.fulfill(json([{ id: BIZ, owner_id: SELLER, business_name: 'Coffee Corner', business_category: 'food' }])));
  await page.route('**/api/products?*', (r) => r.fulfill(json([{ id: PRODUCT, seller_id: SELLER, business_id: BIZ, title: 'Coffee', price: '100.00', currency: 'ETB', stock: 4, status: 'active', view_count: 10 }])));
  await page.route('**/api/orders?*', (r) => r.fulfill(json({ orders: [
    { id: 'o1', seller_id: SELLER, product_id: PRODUCT, product_title: 'Coffee', quantity: 1, total_price: '100.00', currency: 'ETB', status: 'paid', created_at: today },
    { id: 'o2', seller_id: SELLER, product_id: PRODUCT, product_title: 'Coffee', quantity: 2, total_price: '250.00', currency: 'ETB', status: 'completed', created_at: today },
  ], next_cursor: null })));
  await page.route('**/api/saves/my-products*', (r) => r.fulfill(json([
    { target_id: PRODUCT, created_at: today }, { target_id: PRODUCT, created_at: today }, { target_id: PRODUCT, created_at: today },
  ])));
}

test('Business Analytics adds revenue as numbers, shows saves, and switches business in place', async ({ page, context, baseURL }) => {
  const host = new URL(baseURL ?? 'http://localhost:3002').hostname;
  await context.addCookies([{ name: 'nb_auth', value: '1', domain: host, path: '/' }]);
  await mockApi(page);

  await page.goto('/analytics');
  await expect(page.getByText('350 ETB').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('0100.00')).toHaveCount(0);
  const savesStat = page.getByText('Product Saves').locator('..');
  await expect(savesStat).toContainText('3');
  await expect(page.getByText('Product Likes')).toHaveCount(0);

  await page.getByRole('button', { name: /All Businesses/ }).first().click();
  await page.getByRole('button', { name: /Coffee Corner/ }).click();
  await expect(page).toHaveURL(new RegExp(`/analytics\\?business=${BIZ}$`));
  await expect(page.getByRole('heading', { name: /not found|404/i })).toHaveCount(0);
});
