// Copy to frontend-next/e2e/request-budget.spec.ts. No extra dependencies.
// Guards F-040 (Bookmarks request loop) and F-048 (service worker never installs).
import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_TEST_EMAIL ?? '';
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? '';

test('signed-in pages do not poll the API in a loop', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'needs seeded E2E credentials');
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login')), page.getByRole('button', { name: 'Sign in', exact: true }).click()]);

  for (const path of ['/bookmarks', '/feed', '/notifications', '/messages']) {
    const calls: string[] = [];
    const onRequest = (r: { url(): string }) => { if (r.url().includes('/api/')) calls.push(r.url()); };
    page.on('request', onRequest);
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    page.off('request', onRequest);
    // A page may load a handful of resources; a loop produces hundreds.
    expect(calls.length, `${path} made ${calls.length} API calls in 5 s`).toBeLessThan(40);
  }
});

test('the service worker installs and activates', async ({ page }) => {
  await page.goto('/landing', { waitUntil: 'networkidle' });
  const state = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const sw = reg.installing || reg.waiting || reg.active;
    if (!sw) return 'none';
    if (sw.state === 'activated') return 'activated';
    return new Promise<string>((resolve) => {
      sw.addEventListener('statechange', () => { if (sw.state === 'activated' || sw.state === 'redundant') resolve(sw.state); });
      setTimeout(() => resolve(`timeout:${sw.state}`), 8000);
    });
  });
  expect(state).toBe('activated');
});
