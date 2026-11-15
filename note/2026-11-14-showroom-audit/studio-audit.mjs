/**
 * Real-stack audit of the create-showroom flow (wizard + Studio), owner's
 * request 14 Nov 2026 ("the main engine… deep audit as a senior tester").
 *
 * At 390, 768, 1024 and 1440 px it opens every Studio state and records:
 *   - screenshot (full viewport)
 *   - console errors / page errors
 *   - axe WCAG 2.2 AA serious + critical violations
 *   - sideways scroll (document wider than the viewport)
 *   - popovers/menus cut off by the viewport edge
 *   - COVERED: a visible control whose centre is covered by another element
 *     (e.g. a floating button on top of Save)
 *
 * LOCAL stack only. Usage (from frontend-next/, after
 * `source ~/.nodbusiness-local/env.sh`):
 *   node ../note/2026-11-14-showroom-audit/studio-audit.mjs <out-dir>
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const fe = createRequire(path.join(root, 'frontend-next/package.json'));
const be = createRequire(path.join(root, 'backend/package.json'));
const { chromium } = fe('playwright');
const { Pool } = be('pg');
const bcrypt = be('bcryptjs');
const AXE = fe.resolve('axe-core/axe.min.js');
const WEB = process.env.SCAN_WEB || 'http://localhost:3002';
const OUT = process.argv[2] || '/tmp/studio-audit';
const ONLY = process.env.ONLY_STATE ? new RegExp(process.env.ONLY_STATE) : null;
fs.mkdirSync(OUT, { recursive: true });
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) throw new Error('Local DATABASE_URL required');

const VIEWPORTS = (process.env.VIEWPORTS || '390x844,768x1024,1024x768,1440x900').split(',').map((v) => v.split('x').map(Number));

/** In-page: layout problems. */
function layoutScan() {
  const out = [];
  const vw = window.innerWidth; const vh = window.innerHeight;
  if (document.documentElement.scrollWidth > vw + 1) out.push({ kind: 'SIDEWAYS', what: `document ${document.documentElement.scrollWidth}px wide` });
  // Menus / popovers cut by the viewport.
  for (const el of document.querySelectorAll('[role="menu"], [role="dialog"], [role="listbox"], [data-radix-popper-content-wrapper] > *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const st = getComputedStyle(el);
    const scrolls = /(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight;
    if ((r.bottom > vh + 1 || r.top < -1) && !scrolls) out.push({ kind: 'CUT', what: `${el.getAttribute('role') || 'popover'} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.top)}..${Math.round(r.bottom)} of ${vh}` });
    if (r.right > vw + 1 || r.left < -1) out.push({ kind: 'CUT', what: `${el.getAttribute('role') || 'popover'} sideways ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}` });
  }
  // Controls covered by something else at their centre.
  const seen = new Set();
  for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role="switch"], [role="tab"], [role="button"]')) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (r.width < 4 || r.height < 4 || st.visibility === 'hidden' || st.pointerEvents === 'none') continue;
    if (/\bsr-only\b/.test(el.getAttribute('class') || '') || el.closest('[aria-hidden="true"]') || el.closest('[inert]')) continue;
    const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue; // off screen (scrolled), not covered
    // Hidden by a scrolling ancestor's clip: not a covering problem.
    let clipped = false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(ps.overflow + ps.overflowY + ps.overflowX)) {
        const pr = p.getBoundingClientRect();
        if (cx < pr.left || cx > pr.right || cy < pr.top || cy > pr.bottom) { clipped = true; break; }
      }
    }
    if (clipped) continue;
    const top = document.elementFromPoint(cx, cy);
    if (!top || el === top || el.contains(top) || top.contains(el)) continue;
    // A label wrapping its own input is fine.
    if (top.closest('label') && top.closest('label').contains(el)) continue;
    // Expected: an open popover/menu/dialog/toast covers the page; the Next dev indicator is dev-only.
    if (top.closest('nextjs-portal, [data-radix-popper-content-wrapper], [role="dialog"], [role="menu"], [data-sonner-toaster], [role="alertdialog"]') && !el.closest('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"]')) continue;
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    const by = (top.closest('button,a,[role]')?.getAttribute('aria-label') || top.getAttribute('aria-label') || top.className?.toString?.().slice(0, 40) || top.tagName).toString().slice(0, 50);
    const key = `${name}|${by}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: 'COVERED', what: `"${name}" covered by ${by}` });
  }
  return out;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const tag = crypto.randomBytes(3).toString('hex');
const pw = `Aud-${crypto.randomBytes(8).toString('hex')}`;
const { rows: [u] } = await pool.query(`INSERT INTO users (email,password_hash,full_name,provider,is_verified,is_demo,is_seed) VALUES ($1,$2,'Audit Owner','local',TRUE,FALSE,FALSE) RETURNING id,email`, [`aud-${tag}@example.test`, await bcrypt.hash(pw, 10)]);
await pool.query(`INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Audit Owner')`, [u.id]);
const { rows: [b] } = await pool.query(`INSERT INTO businesses (owner_id,business_name,business_category,visibility) VALUES ($1,$2,'shop','public') RETURNING id`, [u.id, `Audit Shop ${tag}`]);
await pool.query(`INSERT INTO business_subscriptions (business_id,tier,status,current_period_start,current_period_end) VALUES ($1,'pro','active',NOW(),NOW()+INTERVAL '30 days')`, [b.id]);

const STUDIO = '/showroom/create?step=3&category=Business+%26+Commerce&template=fashion-clothing-store&sample=premium';
const click = async (p, name) => { await p.getByRole('button', { name }).first().click(); await p.waitForTimeout(500); };
const STATES = [
  ['wizard-1', '/showroom/create', null],
  ['wizard-2', '/showroom/create?step=2&category=Business+%26+Commerce', null],
  ['studio', STUDIO, null],
  ['studio-style', STUDIO, (p) => click(p, /Style: colours and lettering/)],
  ['studio-more', STUDIO, (p) => click(p, /More options/)],
  ['studio-add', STUDIO, async (p) => {
    const tab = p.getByRole('tab', { name: /Sections/ });
    if (await tab.count() && await tab.first().isVisible()) await tab.first().click();
    await p.waitForTimeout(400);
  }],
  ['studio-edit', STUDIO, async (p) => {
    const tab = p.getByRole('tab', { name: /^Edit/ });
    if (await tab.count() && await tab.first().isVisible()) await tab.first().click();
    await p.waitForTimeout(400);
  }],
  ['studio-preview', STUDIO, async (p) => {
    const tab = p.getByRole('tab', { name: /Preview/ });
    if (await tab.count() && await tab.first().isVisible()) await tab.first().click();
    await p.waitForTimeout(400);
  }],
  ['studio-fullscreen', STUDIO, async (p) => { await click(p, /More options/); await click(p, /Full-screen preview/); }],
  ['studio-publish', STUDIO, (p) => click(p, /^Publish/)],
];

const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
const report = [];
try {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  let errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|favicon/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(u.email);
  await page.getByLabel(/^password/i).first().fill(pw);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((x) => !x.pathname.startsWith('/login'), { timeout: 20000 });
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    for (const [name, url, action] of STATES) {
      if (ONLY && !ONLY.test(name)) continue;
      errors = [];
      const add = (kind, what) => report.push({ viewport: w, state: name, kind, what });
      try {
        const t0 = Date.now();
        await page.goto(`${WEB}${url}`, { waitUntil: 'networkidle', timeout: 45000 });
        add('TIME', `${Date.now() - t0} ms to network idle`);
        await page.waitForTimeout(700);
        if (action) await action(page);
        for (const f of await page.evaluate(layoutScan)) add(f.kind, f.what);
        await page.addScriptTag({ path: AXE });
        const ax = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }));
        for (const v of ax.violations.filter((x) => ['serious', 'critical'].includes(x.impact))) add('AXE', `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map((n) => `${n.target.join(' ')} ${n.html.slice(0, 100)} [${(n.any[0]?.message || '').slice(0, 170)}]`).join(' | ')}`.slice(0, 800));
        await page.screenshot({ path: path.join(OUT, `${name}-${w}.png`) });
      } catch (err) {
        add('ERROR', String(err.message).split('\n')[0].slice(0, 200));
        await page.screenshot({ path: path.join(OUT, `${name}-${w}-error.png`) }).catch(() => {});
      }
      for (const e of errors) add('CONSOLE', e);
    }
  }
  await ctx.close();
} finally {
  await browser.close();
  await pool.query('DELETE FROM users WHERE id=$1', [u.id]).catch(() => {});
  await pool.end();
}
fs.writeFileSync(path.join(OUT, 'studio-audit.json'), JSON.stringify(report, null, 2));
const findings = report.filter((r) => r.kind !== 'TIME');
const byKey = new Map();
for (const r of findings) {
  const k = `${r.kind} ${r.state} ${r.what}`;
  const e = byKey.get(k) || { ...r, vps: [] };
  e.vps.push(r.viewport); byKey.set(k, e);
}
console.log(JSON.stringify(findings.reduce((a, r) => ({ ...a, [r.kind]: (a[r.kind] || 0) + 1 }), {})));
for (const e of [...byKey.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.state.localeCompare(b.state))) console.log(`${e.kind.padEnd(8)} ${e.state.padEnd(18)} @${e.vps.join(',')} ${e.what}`);
console.log('--- timings');
for (const r of report.filter((x) => x.kind === 'TIME')) console.log(`${r.state}@${r.viewport}: ${r.what}`);
process.exit(findings.length ? 1 : 0);
