import { test, expect, type Page } from '@playwright/test';

/**
 * The business editor's map pin: tapping the map places it and saving sends
 * latitude/longitude (customers see only the distance unless the address is
 * public; backend lib/locationPrivacy.ts). The API is answered in the browser.
 */
const OWNER = '00000000-0000-4000-8000-0000000000a2';
const BIZ = '00000000-0000-4000-8000-0000000000b2';

async function mockApi(page: Page, saved: Record<string, unknown>[]) {
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/**', (r) => r.fulfill(json([])));
  await page.route('**/api/auth/refresh', (r) => r.fulfill(json({ access_token: 'e2e-token' })));
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ id: OWNER, full_name: 'Shop Owner', role: 'user', onboarding_completed: true })));
  await page.route('**/api/profiles?*', (r) => r.fulfill(json([{ id: 'prof', user_id: OWNER, display_name: 'Shop Owner', profile_type: 'business' }])));
  await page.route(`**/api/businesses/${BIZ}`, async (r) => {
    if (r.request().method() === 'PUT') { saved.push(r.request().postDataJSON()); return r.fulfill(json({ id: BIZ })); }
    return r.fulfill(json({ id: BIZ, owner_id: OWNER, business_name: 'Coffee Corner', business_category: 'food', latitude: null, longitude: null }));
  });
}

test('an owner places a map pin and saving sends it', async ({ page, context, baseURL }) => {
  const host = new URL(baseURL ?? 'http://localhost:3002').hostname;
  await context.addCookies([{ name: 'nb_auth', value: '1', domain: host, path: '/' }]);
  const saved: Record<string, unknown>[] = [];
  await mockApi(page, saved);

  await page.goto(`/business/edit?id=${BIZ}`);
  await expect(page.getByLabel('Business Name')).toHaveValue('Coffee Corner');
  const map = page.getByTestId('location-pin-map');
  await expect(map.locator('.leaflet-container')).toBeVisible();
  await expect(page.getByText('Tap the map to place your pin')).toBeVisible();
  await map.click({ position: { x: 120, y: 90 } });
  await expect(page.getByText('Pin set')).toBeVisible();

  await page.getByRole('button', { name: 'Update Business' }).click();
  await expect.poll(() => saved.length).toBe(1);
  expect(typeof saved[0].latitude).toBe('number');
  expect(typeof saved[0].longitude).toBe('number');
  expect(Math.abs(Number(saved[0].latitude) - 9.0192)).toBeLessThan(0.1);
});
