import { test, expect, Page } from '@playwright/test';

/**
 * Checkout E2E — money-path smoke tests.
 *
 * Tests the purchase modal flow (product → Buy Now → delivery details →
 * checkout options) plus a COD order placed via the API (the most reliable
 * path for automated testing — no external payment provider dependency).
 *
 * Requires seeded accounts + products. Skips otherwise.
 */

const API = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const A = { email: process.env.E2E_TEST_EMAIL ?? 'test@nodbusiness.app', password: process.env.E2E_TEST_PASSWORD ?? 'Test1234!' };

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
    page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Login"), button:has-text("Sign in")').first().click(),
  ]);
}

let token: string | null = null;
let productId: string | null = null;
let sellerId: string | null = null;
let seeded = false;

test.beforeAll(async () => {
  token = await apiLogin(A.email, A.password);
  const adminToken = await apiLogin('admin@nodbusiness.app', 'Admin1234!');
  if (!token || !adminToken) return;

  const adminMe = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const adminBody = await adminMe.json() as { id?: string };
  if (!adminBody.id) return;

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
    }),
  });
  if (createRes.ok) {
    const created = await createRes.json() as { id?: string; seller_id?: string };
    productId = created.id ?? null;
    sellerId = created.seller_id ?? adminBody.id;
    seeded = Boolean(productId);
  }
});

test.describe('Checkout flow', () => {
  test.beforeEach(() => { test.skip(!seeded, 'No seeded products available — run backend seed first'); });

  test('product page renders Buy Now and opens the purchase modal', async ({ page }) => {
    await loginViaUi(page, A.email, A.password);
    await page.goto(`/products/${productId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    const buyBtn = page.locator('button:has-text("Buy Now")').first();
    await expect(buyBtn).toBeVisible({ timeout: 15_000 });
    await buyBtn.click();

    // Purchase modal should appear with the delivery-details form
    await expect(page.locator('text=Checkout').or(page.locator('text=Order')).first()).toBeVisible({ timeout: 10_000 });
  });

  test('buyer can complete a COD order from the purchase modal', async ({ page }) => {
    await loginViaUi(page, A.email, A.password);
    await page.goto(`/products/${productId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    await page.locator('button:has-text("Buy Now")').first().click();
    await expect(page.locator('text=Checkout').or(page.locator('text=Order')).first()).toBeVisible({ timeout: 10_000 });

    // Fill delivery details
    const nameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();
    if (await nameInput.isVisible()) await nameInput.fill('E2E Test Buyer');
    const phoneInput = page.locator('input[placeholder*="phone" i], input[name*="phone" i], input[type="tel"]').first();
    if (await phoneInput.isVisible()) await phoneInput.fill('+251911000000');
    const addressInput = page.locator('input[placeholder*="address" i], input[name*="address" i], textarea[placeholder*="address" i]').first();
    if (await addressInput.isVisible()) await addressInput.fill('Bole Road, Addis Ababa');

    // Advance to checkout
    const continueBtn = page.getByRole('button', { name: /continue to checkout/i });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    const codButton = page.getByRole('button', { name: /place order \(cod\)/i });
    await expect(codButton).toBeVisible({ timeout: 15_000 });
    await codButton.click();
    await expect(page.getByText(/order placed successfully/i)).toBeVisible({ timeout: 15_000 });
  });

  test('COD order via API creates an order', async () => {
    expect(sellerId).toBeTruthy();

    const res = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        seller_id: sellerId,
        product_title: 'E2E COD Test Product',
        total_price: 100,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id?: string; status?: string };
    expect(body.status).toBe('pending');
    expect(body.id).toBeTruthy();
  });
});
