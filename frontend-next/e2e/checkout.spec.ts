import { test, expect, Page } from '@playwright/test';

/**
 * Checkout E2E — money-path smoke tests.
 *
 * Tests the Buy flow (product → Buy Now → the seller's payment method →
 * contact details → order placed; the buyer pays the seller directly) plus a
 * COD order placed via the API.
 *
 * Requires the isolated real-mode accounts from backend/db/seed-e2e.js.
 * The admin fixture creates a fresh product during the suite setup.
 */

const API = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const A = { email: process.env.E2E_TEST_EMAIL ?? 'e2e-buyer@nodbusiness.test', password: process.env.E2E_TEST_PASSWORD ?? 'TestCodexE2E2026!' };
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? 'e2e-seller@nodbusiness.test', password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminCodexE2E2026!' };

async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.access_token ?? null;
}

async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.locator('button[type="submit"]').first().click(),
  ]);
  await expect(page).toHaveURL(/\/feed(?:\?|$)/);
}

let token: string | null = null;
let productId: string | null = null;
let sellerId: string | null = null;
let seeded = false;
let sellerToken: string | null = null;

test.beforeAll(async () => {
  token = await apiLogin(A.email, A.password);
  const adminToken = await apiLogin(ADMIN.email, ADMIN.password);
  sellerToken = adminToken;
  if (!token || !adminToken) return;

  const adminMe = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const adminBody = await adminMe.json() as { id?: string };
  if (!adminBody.id) return;

  // Products are shown only for sellers with a business on an active plan;
  // backend/db/seed-e2e.js creates "E2E Seller Shop" for this (F-032).
  const shops = await fetch(`${API}/api/businesses?owner_id=${adminBody.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const shop = ((await shops.json()) as Array<{ id: string; business_name?: string }>).find((b) => b.business_name === 'E2E Seller Shop');
  if (!shop) return;

  // Use a fresh admin-owned product for every run. The buyer must not be the
  // seller, otherwise ProductDetail correctly hides Buy Now and the UI flow is
  // never exercised.
  const createRes = await fetch(`${API}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: `E2E Test Product ${Date.now()}`,
      description: 'Product created by checkout E2E test',
      price: 250,
      category: 'electronics',
      status: 'active',
      stock: 10,
      currency: 'ETB',
      business_id: shop.id,
    }),
  });
  if (createRes.ok) {
    const created = await createRes.json() as { id?: string; seller_id?: string };
    productId = created.id ?? null;
    sellerId = created.seller_id ?? adminBody.id;
    seeded = Boolean(productId);
  }
});

// Take the product off sale so runs don't leave listings behind (audit DATA-03).
test.afterAll(async () => {
  if (!productId || !sellerToken) return;
  await fetch(`${API}/api/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({ status: 'archived' }),
  }).catch(() => undefined);
});

test.describe('Checkout flow', () => {
  test.beforeEach(() => { test.skip(!seeded, 'No seeded seller business or product — run ALLOW_E2E_SEED=1 npm run seed:e2e in backend/ first'); });

  // The Buy flow pays the seller directly (components/checkout/PurchaseModal.tsx,
  // docs/decisions/platform-model-decisions.md): see the seller's payment
  // method, give contact details, place the order, get a private order link.
  test('Buy Now opens the purchase dialog with the seller\'s payment method', async ({ page }) => {
    await loginViaUi(page, A.email, A.password);
    await page.goto(`/products/${productId}`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Buy Now' }).click();
    const dialog = page.getByRole('dialog', { name: /buy/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByRole('region', { name: 'How to pay' })).toContainText(/telebirr/i, { timeout: 15_000 });
    await expect(dialog.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  test('buyer places a direct order from the purchase dialog', async ({ page }) => {
    await loginViaUi(page, A.email, A.password);
    await page.goto(`/products/${productId}`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Buy Now' }).click();
    const dialog = page.getByRole('dialog', { name: /buy/i });
    await expect(dialog.getByRole('region', { name: 'How to pay' })).toContainText(/telebirr/i, { timeout: 15_000 });
    await dialog.getByRole('button', { name: 'Continue' }).click();

    await dialog.getByLabel('Name').fill('E2E Test Buyer');
    await dialog.getByLabel('Phone').fill('+251911000000');
    await dialog.getByLabel('Email').fill('e2e-direct-order@example.test');
    await dialog.getByLabel('Delivery address (optional)').fill('Bole Road, Addis Ababa');
    await dialog.getByRole('button', { name: /^Place order/ }).click();

    const placed = page.getByRole('dialog', { name: 'Order placed' });
    await expect(placed).toBeVisible({ timeout: 15_000 });
    // The buyer's private order page (where they report the payment).
    await expect(placed.locator('a[href^="/order/"]')).toBeVisible();
  });

  test('COD order via API creates an order', async () => {
    expect(sellerId).toBeTruthy();

    const res = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        product_id: productId,
        quantity: 1,
        buyer_name: 'E2E COD Test Buyer',
        buyer_email: 'seeded-buyer@e2e.test',
        buyer_phone: '+251911223344',
        delivery_address: 'Bole Road, Addis Ababa',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id?: string; status?: string };
    expect(body.status).toBe('pending');
    expect(body.id).toBeTruthy();
  });
});
