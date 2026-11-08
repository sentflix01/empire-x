import { test, expect } from '@playwright/test';

/**
 * Service worker (audit F-048): installs and activates, shows the offline
 * page when the network is down, and never caches pages or API responses.
 * Registers the worker itself, because the app registers it only in
 * production builds.
 */
test.describe('Service worker', () => {
  test('activates, serves /offline without a network and caches only static files', async ({ page, context }) => {
    await page.goto('/landing', { waitUntil: 'load' });

    const state = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const worker = reg.installing ?? reg.waiting ?? reg.active;
      if (worker && worker.state !== 'activated') {
        await new Promise<void>((resolve) => {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated' || worker.state === 'redundant') resolve();
          });
        });
      }
      await navigator.serviceWorker.ready;
      return worker?.state ?? reg.active?.state;
    });
    expect(state).toBe('activated');

    // Reload so the page is controlled, then visit a signed-out page that calls the API.
    await page.reload({ waitUntil: 'load' });
    await page.goto('/feed', { waitUntil: 'load' });

    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        for (const req of await (await caches.open(name)).keys()) urls.push(new URL(req.url).pathname);
      }
      return urls;
    });
    expect(cached).toContain('/offline');
    expect(cached.filter((p) => p.startsWith('/api/'))).toEqual([]);
    expect(cached.filter((p) => !p.startsWith('/_next/static/') && !p.startsWith('/icons/') && !p.startsWith('/brand/') && !['/offline', '/manifest.json'].includes(p))).toEqual([]);

    await context.setOffline(true);
    await page.goto('/marketplace', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: /you.re offline/i })).toBeVisible();
    await context.setOffline(false);
  });

  test('a changed logo shows at once instead of the cached copy', async ({ page, context }) => {
    await page.goto('/landing', { waitUntil: 'load' });
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const worker = reg.installing ?? reg.waiting ?? reg.active;
      if (worker && worker.state !== 'activated') {
        await new Promise<void>((resolve) => worker.addEventListener('statechange', () => {
          if (worker.state === 'activated' || worker.state === 'redundant') resolve();
        }));
      }
    });
    await page.reload({ waitUntil: 'load' });
    expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    const logo = '/brand/nodbusiness-icon.svg';
    const first = await page.evaluate(async (u) => (await fetch(u)).text(), logo);
    expect(first).toContain('<svg');

    // The logo changes on the server: the page must get the new file, not the cached one.
    await context.route(`**${logo}`, (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg id="new-logo"/>' }));
    const second = await page.evaluate(async (u) => (await fetch(u)).text(), logo);
    expect(second).toContain('new-logo');

    // Offline, the last copy is still there.
    await context.unroute(`**${logo}`);
    await context.setOffline(true);
    const offline = await page.evaluate(async (u) => (await fetch(u)).ok, logo);
    expect(offline).toBe(true);
    await context.setOffline(false);
  });
});
