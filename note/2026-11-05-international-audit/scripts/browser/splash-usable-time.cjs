// F-045 fix check (LOCAL ONLY): time until an app page is usable (splash gone) on a throttled phone profile. Needs a production build on :3005.
// Time until the app page is usable (splash gone) on a throttled phone profile:
// Fast 4G-like network, 4x CPU slowdown. First visit and a second visit in the same session.
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const out = {};
  for (const [label, path] of [['first visit /marketplace', '/marketplace'], ['second visit /feed', '/feed'], ['third visit /marketplace (reload)', '/marketplace']]) {
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = Date.now();
    await p.goto('http://localhost:3005' + path, { waitUntil: 'commit' });
    await p.waitForFunction(() => document.querySelector('main#main-content') && !document.querySelector('[role="status"][aria-label="Loading Nodbusiness"]'), null, { timeout: 30000, polling: 50 });
    out[label] = { usable_ms: Date.now() - t0, bytes_video: await p.evaluate(() => performance.getEntriesByType('resource').filter((r) => /\.mp4/.test(r.name)).reduce((s, r) => s + r.transferSize, 0)) };
    await p.close();
  }
  console.log(JSON.stringify(out));
  await b.close();
})();
