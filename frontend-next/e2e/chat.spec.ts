import { test, expect, Page } from '@playwright/test';

/**
 * Realtime chat E2E — SLO S4 (message delivery) end-to-end.
 *
 * Two authenticated browser contexts: user A sends a message in a DM with
 * user B; B must see it appear LIVE (no reload). Validates the whole chain:
 * UI send → Socket.IO (access-token auth, conv room join) → recipient render.
 *
 * Requires seeded accounts (backend/db/seed.js). Skips otherwise.
 */

const API = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const A = { email: process.env.E2E_TEST_EMAIL ?? 'test@nodbusiness.app', password: process.env.E2E_TEST_PASSWORD ?? 'Test1234!' };
const B = { email: process.env.E2E_ADMIN_EMAIL ?? 'admin@nodbusiness.app', password: process.env.E2E_ADMIN_PASSWORD ?? 'Admin1234!' };

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
  // Dev-mode lazy compilation: wait for hydration to settle before interacting.
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  const loginResponse = page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 20_000 }).catch(() => null);
  await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Login"), button:has-text("Sign in")').first().click();
  try {
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  } catch (e) {
    const cookies = await page.context().cookies();
    console.log('[chat-e2e] STUCK URL:', page.url());
    console.log('[chat-e2e] cookies:', cookies.map((c) => c.name).join(','));
    console.log('[chat-e2e] login POST status:', (await loginResponse)?.status() ?? 'none');
    console.log('[chat-e2e] body text:', (await page.locator('body').innerText().catch(() => '')).slice(0, 200).replace(/\n/g, ' | '));
    throw e;
  }
  const resp = await loginResponse;
  console.log(`[chat-e2e] UI login ${email}: POST status ${resp?.status() ?? 'none'}`);
}

let convId: string | null = null;
let seeded = false;
let skipReason = 'Seeded accounts or conversation unavailable — run backend seed first';

test.beforeAll(async () => {
  const tokenA = await apiLogin(A.email, A.password);
  const tokenB = await apiLogin(B.email, B.password);
  console.log('[chat-e2e] tokenA:', Boolean(tokenA), '· tokenB:', Boolean(tokenB));
  seeded = Boolean(tokenA && tokenB);
  if (!seeded) {
    // Distinguish "no seed data" from "backend/DB unreachable" (e.g. Neon
    // compute-quota exhaustion returns 500 on every query).
    skipReason = 'Backend unreachable or DB quota exhausted — login returned an error. Check DATABASE_URL / Neon plan.';
    return;
  }
  const me = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${tokenB}` } });
  const meBody = await me.json() as { id?: string };
  const conv = await fetch(`${API}/api/messages/conversations/find-or-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ target_user_id: meBody.id }),
  });
  console.log('[chat-e2e] find-or-create:', conv.status);
  if (conv.ok) {
    const body = await conv.json() as { id?: string; conversation?: { id?: string } };
    convId = body.id ?? body.conversation?.id ?? null;
  }
  console.log('[chat-e2e] convId:', convId);
  seeded = Boolean(convId);
});

test.describe('Realtime chat', () => {
  // beforeEach runs AFTER beforeAll, so the seeded flag is already computed.
  test.beforeEach(() => { test.skip(!seeded, skipReason); });
  test('message sent by A appears live for B without a reload', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await loginViaUi(pageA, A.email, A.password);
    await loginViaUi(pageB, B.email, B.password);

    await pageA.goto(`/messages/${convId}`, { waitUntil: 'domcontentloaded' });
    await pageB.goto(`/messages/${convId}`, { waitUntil: 'domcontentloaded' });
    await expect(pageA.locator('input[placeholder="Message"], textarea[placeholder="Message"]').first()).toBeVisible();
    await expect(pageB.locator('input[placeholder="Message"], textarea[placeholder="Message"]').first()).toBeVisible();

    const unique = `e2e-ping-${Date.now()}`;

    // A sends; B must receive it over Socket.IO — no reload on B.
    await pageA.locator('input[placeholder="Message"], textarea[placeholder="Message"]').first().fill(unique);
    await pageA.keyboard.press('Enter');
    await expect(pageB.getByText(unique).first()).toBeVisible({ timeout: 15_000 });

    // And A's own list reflects it too (optimistic/echo path).
    await expect(pageA.getByText(unique).first()).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });

  test('recipient sees the message after a reload too (persistence)', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await loginViaUi(pageA, A.email, A.password);
    await loginViaUi(pageB, B.email, B.password);
    await pageA.goto(`/messages/${convId}`, { waitUntil: 'domcontentloaded' });
    await pageB.goto(`/messages/${convId}`, { waitUntil: 'domcontentloaded' });

    const unique = `e2e-persist-${Date.now()}`;
    await pageA.locator('input[placeholder="Message"], textarea[placeholder="Message"]').first().fill(unique);
    await pageA.keyboard.press('Enter');
    await expect(pageB.getByText(unique).first()).toBeVisible({ timeout: 15_000 });

    await pageB.reload({ waitUntil: 'domcontentloaded' });
    await expect(pageB.getByText(unique).first()).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
