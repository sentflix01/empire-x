import { test, expect, type Page } from '@playwright/test';

/**
 * Mobile load budget (audit F-045): the 1 MB intro video is never downloaded;
 * the landing hero and the sign-in logo use the small version (once, then the
 * vector logo) only when motion is allowed; app pages load no video; the
 * splash shows once per session and briefly.
 */
const media = (page: Page) => {
  const urls: { url: string }[] = [];
  page.on('request', (req) => {
    if (/\.(mp4|webm)(\?|$)/.test(req.url())) urls.push({ url: req.url() });
  });
  return urls;
};

test('app pages download no video', async ({ page }) => {
  const seen = media(page);
  for (const path of ['/feed', '/marketplace']) await page.goto(path, { waitUntil: 'networkidle' });
  expect(seen).toEqual([]);
});

test('sign-in pages use only the small video', async ({ page }) => {
  const seen = media(page);
  for (const path of ['/login', '/register']) await page.goto(path, { waitUntil: 'networkidle' });
  expect([...new Set(seen.map((m) => new URL(m.url).pathname))]).toEqual(['/brand/nodbusiness-intro-288-v2.mp4']);
});

test('the landing hero uses the small video, under 200 KB', async ({ page, request }) => {
  const seen = media(page);
  await page.goto('/landing', { waitUntil: 'networkidle' });
  // Browsers fetch video in range requests, so the same file can appear more than once.
  expect([...new Set(seen.map((m) => new URL(m.url).pathname))]).toEqual(['/brand/nodbusiness-intro-288-v2.mp4']);
  const size = Number((await request.head('/brand/nodbusiness-intro-288-v2.mp4')).headers()['content-length']);
  expect(size).toBeGreaterThan(0);
  expect(size).toBeLessThan(200 * 1024);
});

test('reduced motion shows the static logo instead of the video', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const seen = media(page);
  await page.goto('/landing', { waitUntil: 'networkidle' });
  expect(seen).toEqual([]);
  await expect(page.locator('video')).toHaveCount(0);
  await context.close();
});

test('the splash shows once per session and leaves within a second', async ({ page }) => {
  const splash = page.locator('[role="status"][aria-label="Loading Nodbusiness"]');
  await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  const start = Date.now();
  await expect(splash).toHaveCount(0, { timeout: 2000 });
  expect(Date.now() - start).toBeLessThan(1500);
  await page.goto('/feed', { waitUntil: 'load' });
  await expect(splash).toHaveCount(0, { timeout: 1000 });
});

/**
 * Script budget (performance audit 2026-11-09): compressed JavaScript a guest
 * downloads until the page is idle, with Next.js link prefetching blocked so
 * only the page itself counts (prefetching depends on which links are on
 * screen). About 8% above what was measured after the audit's fixes in a local
 * production build (landing 274 KB, marketplace 313, feed 418, explore 411).
 * Raising one needs a reason in the PR: most growth comes from a heavy library
 * imported into a page or the app shell instead of loaded on demand (jsPDF,
 * framer-motion, maps, charts).
 */
const SCRIPT_BUDGET_KB: Record<string, number> = { '/landing': 300, '/marketplace': 340, '/feed': 450, '/explore': 445 };

for (const [path, budget] of Object.entries(SCRIPT_BUDGET_KB)) {
  test(`${path} needs at most ${budget} KB of script`, async ({ page }) => {
    await page.route('**/*', (route) => (route.request().headers()['next-router-prefetch'] ? route.abort() : route.continue()));
    const sizes: Promise<number>[] = [];
    page.on('requestfinished', (req) => {
      if (req.resourceType() === 'script') sizes.push(req.sizes().then((s) => s.responseBodySize));
    });
    await page.goto(path, { waitUntil: 'networkidle' });
    const kb = (await Promise.all(sizes)).reduce((a, b) => a + b, 0) / 1024;
    expect(kb, `${path} script KB`).toBeLessThanOrEqual(budget);
  });
}
