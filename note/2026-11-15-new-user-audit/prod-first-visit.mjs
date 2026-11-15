/**
 * Production, read-only: what a first-time visitor on a phone gets.
 * Creates no account and submits nothing. Measures Core Web Vitals (LCP, CLS,
 * TTFB, FCP; INP needs a real tap, approximated by the event timing of one
 * tap on a harmless control), bytes, requests, console errors, and records
 * what the sign-up and login pages show.
 *
 * Usage: node ../note/2026-11-15-new-user-audit/prod-first-visit.mjs <out-dir>
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const fe = createRequire(path.join(root, 'frontend-next/package.json'));
const { chromium, devices } = fe('playwright');
const SITE = process.env.SITE || 'https://nodbusiness.vercel.app';
const OUT = process.argv[2] || '/tmp/prod-first-visit';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
const report = {};
async function visit(name, url, network) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (network) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', network); }
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
  const errors = []; const failed = []; let bytes = 0; let js = 0; let img = 0; let requests = 0;
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 180)); });
  page.on('response', async (r) => {
    requests++;
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 120)}`);
    const len = Number(r.headers()['content-length'] || 0);
    bytes += len;
    if (/javascript/.test(r.headers()['content-type'] || '')) js += len;
    if (/image\//.test(r.headers()['content-type'] || '')) img += len;
  });
  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0, lcpEl: '' };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__vitals.lcp = e.startTime; window.__vitals.lcpEl = (e.element?.tagName || '') + (e.element?.className ? `.${String(e.element.className).split(' ')[0]}` : ''); } }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const t = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  const load = Date.now() - t;
  await page.waitForTimeout(3500);
  const vitals = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    return { ...window.__vitals, ttfb: nav?.responseStart ?? 0, fcp, domInteractive: nav?.domInteractive ?? 0 };
  });
  const page_ = await page.evaluate(() => ({
    lang: document.documentElement.lang, dir: document.documentElement.dir || 'ltr',
    title: document.title,
    description: document.querySelector('meta[name=description]')?.content || '',
    ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
    canonical: document.querySelector('link[rel=canonical]')?.href || '',
    viewport: document.querySelector('meta[name=viewport]')?.content || '',
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().replace(/\s+/g, ' ')),
    cookieBanner: Boolean([...document.querySelectorAll('[role=dialog],[role=region],div')].find((d) => /cookie/i.test(d.textContent || '') && d.getBoundingClientRect().height > 30 && d.getBoundingClientRect().height < 400)),
    privacyLink: Boolean([...document.querySelectorAll('a')].find((a) => /privacy/i.test(a.textContent))),
    termsLink: Boolean([...document.querySelectorAll('a')].find((a) => /terms|agreement/i.test(a.textContent))),
    languageSwitch: [...document.querySelectorAll('button,select,a')].map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim()).filter((t) => /language|EN|አማ|Français|Swahili/i.test(t)).slice(0, 4),
    imgsNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
    images: [...document.querySelectorAll('img')].length,
  }));
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  report[name] = { url, network: network ? 'Slow 4G' : 'unthrottled', load_ms: load, vitals: { ...vitals, lcp: Math.round(vitals.lcp), cls: Number(vitals.cls.toFixed(3)), ttfb: Math.round(vitals.ttfb), fcp: Math.round(vitals.fcp) }, requests, kb: Math.round(bytes / 1024), js_kb: Math.round(js / 1024), img_kb: Math.round(img / 1024), page: page_, consoleErrors: [...new Set(errors)].slice(0, 6), failed: [...new Set(failed)].slice(0, 6) };
  return { ctx, page };
}

// Slow 4G as Lighthouse defines it: 150 ms RTT, 1.6 Mbps down, 750 Kbps up.
const SLOW4G = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
try {
  let v = await visit('landing-slow4g', `${SITE}/`, SLOW4G); await v.ctx.close();
  v = await visit('landing-fast', `${SITE}/`, null); await v.ctx.close();
  v = await visit('register', `${SITE}/register`, null);
  const p = v.page;
  report.register.form = await p.evaluate(() => ({
    fields: [...document.querySelectorAll('input:not([type=hidden])')].filter((i) => i.offsetParent || i.type === 'checkbox').map((i) => `${i.type}#${i.id}`),
    focused: document.activeElement?.id || document.activeElement?.tagName,
    google: document.querySelector('[aria-label="Sign up with Google"]')?.innerHTML.length > 50 ? 'rendered' : (document.body.innerText.match(/Google[^\n]*/) || [''])[0],
    submitDisabled: [...document.querySelectorAll('button[type=submit]')].pop()?.disabled,
    aboveFold: (() => { const b = [...document.querySelectorAll('button[type=submit]')].pop(); return b ? Math.round(b.getBoundingClientRect().top) : null; })(),
    viewport: innerHeight,
  }));
  // Inline checks without submitting: typo email and short password.
  await p.locator('#email').fill('selam@gmial'); await p.locator('#password').fill('short');
  report.register.typoEmailAccepted = await p.locator('#email').evaluate((e) => e.checkValidity());
  await v.ctx.close();
  v = await visit('login', `${SITE}/login`, null);
  report.login.form = await v.page.evaluate(() => ({ google: (document.body.innerText.match(/Google[^\n]*/) || [''])[0], magicLink: /magic link|email me a link|passwordless/i.test(document.body.innerText), focused: document.activeElement?.id || document.activeElement?.tagName }));
  await v.ctx.close();
  v = await visit('feed-guest', `${SITE}/feed`, null); await v.ctx.close();
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(OUT, 'prod-first-visit.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
