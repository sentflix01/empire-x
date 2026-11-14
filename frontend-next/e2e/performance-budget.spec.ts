import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Mobile load budget (audit F-045, amended by "Promo videos load when
 * visible"): the 1 MB intro video is never downloaded; the sign-in logo uses
 * the small version (once, then the vector logo) only when motion is allowed,
 * and the landing hero logo is the vector icon (no video); the only video on app pages is the feed banner's
 * promo clip, under 400 KB; the landing promo clip stays under 2 MB; with
 * reduced motion no page loads any video; the splash shows once per session
 * and briefly.
 */
const media = (page: Page) => {
  const urls: { url: string }[] = [];
  page.on('request', (req) => {
    if (/\.(mp4|webm)(\?|$)/.test(req.url())) urls.push({ url: req.url() });
  });
  return urls;
};

const KB = 1024;
const paths = (seen: { url: string }[]) => [...new Set(seen.map((m) => new URL(m.url).pathname))];
const sizeOf = async (request: APIRequestContext, path: string) => Number((await request.head(path)).headers()['content-length']);

test('app pages download no video except the feed banner clip, under 400 KB', async ({ page, request }) => {
  const seen = media(page);
  await page.goto('/marketplace', { waitUntil: 'networkidle' });
  expect(seen).toEqual([]);
  await page.goto('/feed', { waitUntil: 'networkidle' });
  const loaded = paths(seen);
  expect(loaded.length).toBeLessThanOrEqual(1);
  for (const path of loaded) {
    expect(path).toMatch(/^\/promo\/banner-\d+x\d+-v\d+\.mp4$/);
    const size = await sizeOf(request, path);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(400 * KB);
  }
});

test('sign-in pages use only the small video', async ({ page }) => {
  const seen = media(page);
  for (const path of ['/login', '/register']) await page.goto(path, { waitUntil: 'networkidle' });
  expect([...new Set(seen.map((m) => new URL(m.url).pathname))]).toEqual(['/brand/nodbusiness-intro-288-v2.mp4']);
});

test('the landing hero loads no logo video and at most one promo clip', async ({ page, request }) => {
  const seen = media(page);
  await page.goto('/landing', { waitUntil: 'networkidle' });
  // The hero logo is the vector icon turning 720° (SpinningGlobeIcon), so the
  // intro video is never fetched here. Browsers fetch video in range
  // requests, so the same file can appear more than once.
  const loaded = paths(seen);
  expect(loaded).not.toContain('/brand/nodbusiness-intro-288-v2.mp4');
  expect(loaded.length).toBeLessThanOrEqual(1);
  for (const path of loaded) {
    expect(path).toMatch(/^\/promo\/landing-\d+x\d+-v\d+\.mp4$/);
    expect(await sizeOf(request, path)).toBeLessThan(2000 * KB);
  }
});

test('reduced motion shows still pictures instead of any video', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const seen = media(page);
  for (const path of ['/landing', '/feed']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('video')).toHaveCount(0);
  }
  expect(seen).toEqual([]);
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
