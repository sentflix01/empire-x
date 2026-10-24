import { test, expect, Page } from '@playwright/test';

/**
 * Regression for audit FUNC-03 / UX-08: a product listed from the normal
 * "Add Product" form must be buyable. The seller lists it through the form,
 * then a second account buys it through the Buy sheet.
 *
 * Needs the isolated accounts from backend/db/seed-e2e.js and a backend with
 * the Chapa sandbox (CHAPA_SECRET_KEY=SANDBOX) so the seller's plan can be
 * paid in test mode. It writes data, so it refuses any non-local backend.
 */

const API = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const BUYER = { email: process.env.E2E_TEST_EMAIL ?? 'e2e-buyer@nodbusiness.test', password: process.env.E2E_TEST_PASSWORD ?? 'TestCodexE2E2026!' };
const SELLER = { email: process.env.E2E_ADMIN_EMAIL ?? 'e2e-seller@nodbusiness.test', password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminCodexE2E2026!' };

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
if (!LOCAL_HOSTS.includes(new URL(API).hostname)) {
  throw new Error(`buy-normal-product.spec refuses to run against ${API}: it creates data. Use a local backend.`);
}

async function api<T = Record<string, unknown>>(path: string, token: string | null, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({})) as T;
  return { status: res.status, body };
}

async function apiLogin(who: { email: string; password: string }): Promise<string | null> {
  const { status, body } = await api<{ access_token?: string }>('/api/auth/login', null, { method: 'POST', body: JSON.stringify(who) });
  return status === 200 ? body.access_token ?? null : null;
}

async function loginViaUi(page: Page, who: { email: string; password: string }) {
  // The first-visit page tours cover the form; this test is about buying, so mark them seen.
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      return /^nodbusiness-tour-.+-done$/.test(key) ? 'true' : original.call(this, key);
    };
  });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // Wait for the form to hydrate, or React resets what was typed.
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  const email = page.locator('input[type="email"]').first();
  await expect(async () => {
    await email.fill(who.email);
    await expect(email).toHaveValue(who.email, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.locator('input[type="password"]').first().fill(who.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.locator('button[type="submit"]').first().click(),
  ]);
}

/** Closes the first-visit page guide and the push prompt when they appear. */
async function dismissOverlays(page: Page) {
  for (const name of [/skip guide/i, /^not now$/i]) {
    const button = page.getByRole('button', { name }).first();
    if (await button.isVisible({ timeout: 2_000 }).catch(() => false)) await button.click().catch(() => {});
  }
}

let ready = false;
let skipReason = 'setup did not run';
let businessId = '';
let productId = '';
let sellerToken: string | null = null;

test.beforeAll(async () => {
  sellerToken = await apiLogin(SELLER);
  const buyerToken = await apiLogin(BUYER);
  if (!sellerToken || !buyerToken) { skipReason = 'E2E accounts missing: run backend seed:e2e first'; return; }
  const me = await api<{ id?: string }>('/api/auth/me', sellerToken);
  if (!me.body.id) { skipReason = 'could not read the seller account'; return; }

  // The seller needs exactly one business, with a paid plan and a payment method.
  const owned = await api<Array<{ id: string }>>(`/api/businesses?owner_id=${me.body.id}`, sellerToken);
  if (owned.body.length > 1) { skipReason = 'the E2E seller owns several businesses'; return; }
  if (owned.body.length === 1) {
    businessId = owned.body[0].id;
  } else {
    const created = await api<{ id?: string }>('/api/businesses', sellerToken, {
      method: 'POST',
      body: JSON.stringify({ business_name: 'E2E Seller Shop', business_category: 'Business & Commerce', public_contact_fields: [] }),
    });
    if (!created.body.id) { skipReason = `could not create the seller's business (${created.status})`; return; }
    businessId = created.body.id;
  }

  const checkout = await api<{ tx_ref?: string }>('/api/subscriptions/checkout', sellerToken, {
    method: 'POST', body: JSON.stringify({ business_id: businessId, plan: 'normal', months: 1 }),
  });
  if (checkout.status === 503) { skipReason = 'Chapa sandbox not enabled on this backend (CHAPA_SECRET_KEY=SANDBOX)'; return; }
  if (checkout.body.tx_ref) {
    await fetch(`${API}/api/subscriptions/chapa/sandbox/pay`, {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ tx_ref: checkout.body.tx_ref }).toString(),
    });
    await api(`/api/subscriptions/payments/${encodeURIComponent(checkout.body.tx_ref)}/status`, sellerToken);
  }

  const accounts = await api<unknown[]>(`/api/businesses/${businessId}/payment-accounts`, sellerToken);
  if (!Array.isArray(accounts.body) || accounts.body.length === 0) {
    await api(`/api/businesses/${businessId}/payment-accounts`, sellerToken, {
      method: 'POST',
      body: JSON.stringify({ method: 'mobile_money', provider_name: 'telebirr', account_name: 'E2E Seller Shop', account_number: '0911000555' }),
    });
  }
  ready = true;
});

test.afterAll(async () => {
  // Take the product off sale so repeated runs don't pile up listings.
  if (productId && sellerToken) await api(`/api/products/${productId}`, sellerToken, { method: 'PUT', body: JSON.stringify({ status: 'archived' }) });
});

test.describe.serial('A product listed from the normal form can be bought', () => {
  test.beforeEach(() => { test.skip(!ready, skipReason); });

  test('the seller lists it and it belongs to their business', async ({ page }) => {
    await loginViaUi(page, SELLER);
    await page.goto('/products/create', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await page.getByPlaceholder('Product name').fill(`Guard Beans ${Date.now()}`);
    await page.getByRole('spinbutton').first().fill('120');

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/products') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Publish Product' }).click(),
    ]);
    expect(response.status()).toBe(201);
    const created = await response.json() as { id: string; business_id: string | null; payment_ready: boolean };
    expect(created.business_id).toBe(businessId);
    expect(created.payment_ready).toBe(true);
    productId = created.id;
  });

  test('a buyer opens the Buy sheet and places the order', async ({ page }) => {
    expect(productId, 'the listing step must run first').not.toBe('');
    await loginViaUi(page, BUYER);
    await page.goto(`/products/${productId}`, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await page.getByRole('button', { name: /buy now/i }).first().click();

    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('Sold by E2E Seller Shop');
    await expect(sheet).not.toContainText(/hasn't added a way to pay/i);
    await expect(sheet).toContainText('telebirr');
    await sheet.getByRole('button', { name: 'Continue' }).click();

    await sheet.getByLabel('Phone').fill('+251911000666');
    await sheet.getByRole('button', { name: /place order/i }).click();
    await expect(sheet.getByRole('heading', { name: 'Order placed' })).toBeVisible();
  });
});
