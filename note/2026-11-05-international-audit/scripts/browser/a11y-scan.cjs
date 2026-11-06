// Wave 4 accessibility scan (LOCAL ONLY). axe-core (WCAG 2.0–2.2 A/AA) + reflow at 320 px
// + target size (SC 2.5.8) + <html lang>, for guest and signed-in pages.
//
//   source ~/.nodbusiness-local/env.sh
//   AXE_PATH=<path to axe-core/axe.min.js (pinned 4.10.3)> PAGES_JSON='{"dynamic":[...]}' \
//     node a11y-scan.cjs > evidence/wave4/a11y-scan.json
// Uses the preinstalled Playwright (require('playwright')).
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:3002';
const AXE = fs.readFileSync(process.env.AXE_PATH, 'utf8');
const extra = JSON.parse(process.env.PAGES_JSON || '{"dynamic":[]}');
const GUEST = ['/landing', '/login', '/register', '/forgot-password', '/marketplace', '/businesses', '/showrooms', '/feed', '/explore', '/nearby', '/service-agreement', '/offline'];
const MEMBER = ['/feed', '/explore', '/marketplace', '/messages', '/notifications', '/orders', '/cart', '/settings', '/account', '/profile', '/profile/edit', '/products/create', '/business/create', '/business/subscription', '/showroom/create', '/search', '/friends', '/bookmarks'];

async function audit(page, path) {
  const out = { path, url: null, status: null };
  try {
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 });
    out.status = res?.status() ?? null;
  } catch (e) { out.error = e.message.split('\n')[0]; return out; }
  await page.waitForTimeout(800);
  out.url = page.url().replace(BASE, '');
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations', 'incomplete'] });
    const pick = (v) => ({ id: v.id, impact: v.impact, wcag: v.tags.filter((t) => /^wcag\d/.test(t)), nodes: v.nodes.length, sample: v.nodes.slice(0, 2).map((n) => n.target.join(' ').slice(0, 120)) });
    return { violations: res.violations.map(pick), incomplete: res.incomplete.length };
  });
  Object.assign(out, r);
  out.lang = await page.evaluate(() => document.documentElement.lang || null);
  out.title = await page.title();
  // Target size (SC 2.5.8 minimum 24x24 CSS px; inline text links are exempt).
  out.small_targets = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, [role="button"], a[href], input:not([type="hidden"]), select, [role="checkbox"], [role="switch"], [role="tab"]')];
    return els.filter((el) => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') return false;
      if (el.tagName === 'A' && cs.display === 'inline') return false;
      return r.width < 24 || r.height < 24;
    }).length;
  });
  return out;
}

async function reflow(browser, path, storageState) {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 }, storageState });
  const p = await ctx.newPage();
  try { await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(600); }
  catch { await ctx.close(); return null; }
  const m = await p.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  await ctx.close();
  return { ...m, horizontal_scroll: m.scrollWidth > m.clientWidth + 1 };
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  // Guest
  const g = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const gp = await g.newPage();
  for (const path of [...GUEST, ...extra.dynamic]) {
    const r = await audit(gp, path); r.role = 'guest'; r.reflow_320 = await reflow(browser, path); results.push(r);
  }
  await g.close();
  // Signed-in member
  const m = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const mp = await m.newPage();
  await mp.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await mp.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL);
  await mp.getByLabel('Password', { exact: true }).fill(process.env.E2E_TEST_PASSWORD);
  await Promise.all([mp.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }), mp.getByRole('button', { name: 'Sign in', exact: true }).click()]);
  const state = await m.storageState();
  for (const path of [...MEMBER, ...extra.dynamic]) {
    const r = await audit(mp, path); r.role = 'member'; r.reflow_320 = await reflow(browser, path, state); results.push(r);
  }
  await m.close();
  await browser.close();
  console.log(JSON.stringify({ ran_at: new Date().toISOString(), axe: '4.10.3', tags: 'wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa', base: BASE, results }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
