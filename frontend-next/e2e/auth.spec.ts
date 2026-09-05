import { test, expect } from '@playwright/test';

/**
 * Authenticated smoke flows — TD-003.
 *
 * Requires the seeded accounts from backend/db/seed.js:
 *   test@nodbusiness.app / Test1234!
 *
 * When the seed data (or the backend) is missing, these tests SKIP instead of
 * failing — the public.spec.ts suite owns the zero-state guarantees.
 */

const API = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const SEEDED_EMAIL = process.env.E2E_TEST_EMAIL ?? 'test@nodbusiness.app';
const SEEDED_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'Test1234!';

/** Skip the whole suite when the seeded account cannot log in via the API. */
async function seedAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SEEDED_EMAIL, password: SEEDED_PASSWORD }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { access_token?: string };
    return Boolean(body.access_token);
  } catch {
    return false;
  }
}

let hasSeed = false;
test.beforeAll(async () => {
  hasSeed = await seedAvailable();
  test.skip(!hasSeed, `Seeded account ${SEEDED_EMAIL} unavailable — run backend seed first`);
});

test.describe('Authenticated flows', () => {
  test('login with valid credentials reaches the authenticated app shell', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // Dev-mode lazy compilation: wait for hydration to settle before interacting.
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    // Fill whatever email/password inputs the form exposes.
    await page.locator('input[type="email"], input[name="email"]').first().fill(SEEDED_EMAIL);
    await page.locator('input[type="password"]').first().fill(SEEDED_PASSWORD);
    await Promise.all([
      page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }),
      page.locator('button[type="submit"]').first().click(),
    ]);

    // The hint cookie that powers middleware gating must now exist…
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'nb_auth')).toBeTruthy();

    // …and the token itself must NOT be readable anywhere client-side (TD-014).
    const leaked = await page.evaluate(() => ({
      ls: window.localStorage.getItem('access_token'),
      cookie: document.cookie.includes('access_token='),
    }));
    expect(leaked.ls).toBeNull();
    expect(leaked.cookie).toBeFalsy();

    // Reload proves silent re-hydration via the HttpOnly refresh cookie works.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('login rejects bad credentials without navigation', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().fill(SEEDED_EMAIL);
    await page.locator('input[type="password"]').first().fill('definitely-wrong-password');
    await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Login"), button:has-text("Sign in")').first().click();
    await page.waitForTimeout(2_000); // allow the error toast/state to settle
    await expect(page).toHaveURL(/\/login/);
  });
});
