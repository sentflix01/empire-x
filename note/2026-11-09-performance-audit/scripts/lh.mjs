// Lighthouse runner: mobile (default simulated throttling), N runs per page, median.
// Usage: node lh.mjs <outDir> <runs> [pageKey...]
// LH_SHOWROOM_SLUG / LH_PRODUCT_ID pick the showroom and product pages (local seed data).
// Logged-in pages reuse a persistent Chromium profile that Playwright signs into first.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:3002';
const [outDir, runsArg, ...only] = process.argv.slice(2);
const RUNS = Number(runsArg || 3);
fs.mkdirSync(outDir, { recursive: true });

const PAGES = {
  landing: { url: '/landing' },
  login: { url: '/login' },
  register: { url: '/register' },
  feed: { url: '/feed' },
  marketplace: { url: '/marketplace' },
  businesses: { url: '/businesses' },
  showrooms: { url: '/showrooms' },
  explore: { url: '/explore' },
  showroom: { url: '/showroom/' + (process.env.LH_SHOWROOM_SLUG ?? 'kaldi-s-coffee-roasters-1794256211372-a54y') },
  product: { url: '/products/' + (process.env.LH_PRODUCT_ID ?? 'fddff3b9-bf35-465e-afc5-c4b9e3df2f97') },
  'feed-auth': { url: '/feed', auth: true },
  'orders-auth': { url: '/orders', auth: true },
  'messages-auth': { url: '/messages', auth: true },
};

async function withBrowser(auth, fn) {
  const dir = fs.mkdtempSync(path.join(outDir, '.profile-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: true,
    args: [`--remote-debugging-port=${port}`, '--no-sandbox'],
  });
  try {
    if (auth) {
      const page = await ctx.newPage();
      await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
      await page.locator('input[type="email"], input[name="email"]').first().fill(process.env.E2E_TEST_EMAIL);
      await page.locator('input[type="password"]').first().fill(process.env.E2E_TEST_PASSWORD);
      await Promise.all([
        page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }),
        page.locator('button[type="submit"]').first().click(),
      ]);
      await page.waitForLoadState('networkidle');
      // Mark the once-per-session splash as already seen? No: Lighthouse opens a new tab
      // (new sessionStorage), so first-visit splash behaviour is what gets measured.
      await page.close();
    }
    return await fn(port);
  } finally {
    await ctx.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const summary = {};
for (const [key, p] of Object.entries(PAGES)) {
  if (only.length && !only.includes(key)) continue;
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const lhr = await withBrowser(p.auth, async (port) => {
      const r = await lighthouse(BASE + p.url, { port, output: 'json', logLevel: 'error', disableStorageReset: false });
      return r.lhr;
    });
    const a = lhr.audits;
    const bytesByType = {};
    for (const it of a['resource-summary']?.details?.items ?? []) bytesByType[it.resourceType] = it.transferSize;
    const run = {
      finalUrl: lhr.finalDisplayedUrl,
      perf: Math.round(lhr.categories.performance.score * 100),
      a11y: Math.round(lhr.categories.accessibility.score * 100),
      bp: Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100),
      fcp: a['first-contentful-paint'].numericValue,
      lcp: a['largest-contentful-paint'].numericValue,
      tbt: a['total-blocking-time'].numericValue,
      cls: a['cumulative-layout-shift'].numericValue,
      si: a['speed-index'].numericValue,
      ttfb: a['server-response-time']?.numericValue,
      jsKB: Math.round((bytesByType.script ?? 0) / 1024),
      totalKB: Math.round((bytesByType.total ?? 0) / 1024),
    };
    runs.push(run);
    if (i === 0) fs.writeFileSync(path.join(outDir, `${key}.json`), JSON.stringify(lhr));
    process.stderr.write(`${key} run${i + 1}: ${JSON.stringify(run)}\n`);
  }
  const m = {};
  for (const k of Object.keys(runs[0])) m[k] = typeof runs[0][k] === 'number' ? median(runs.map((r) => r[k])) : runs[0][k];
  summary[key] = m;
}
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.table(Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, {
  perf: v.perf, a11y: v.a11y, bp: v.bp, seo: v.seo,
  FCP: Math.round(v.fcp), LCP: Math.round(v.lcp), TBT: Math.round(v.tbt), CLS: +v.cls.toFixed(3),
  TTFB: Math.round(v.ttfb ?? 0), JSKB: v.jsKB, totKB: v.totalKB,
}])));
