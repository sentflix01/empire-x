/**
 * Platform-wide scan for deformed or too-small controls (owner, 14 Nov 2026:
 * stretched switches and buttons "in so many places, especially on mobile").
 *
 * For every visible button-like control on each page and viewport it reports:
 *   - STRETCHED: rendered taller than its own content and classes ask for
 *     (measured by re-laying it out with min-height:0), e.g. a 36x20 switch
 *     shown 36x44, a round icon button turned into an oval;
 *   - MISSHAPEN: a switch taller than wide, or a round control (rounded-full,
 *     equal width/height classes) that is no longer round;
 *   - SMALL: a hit area under 24x24 px (WCAG 2.2 SC 2.5.8) — the control's
 *     box or its ::after hit-area, whichever is larger.
 *
 * LOCAL stack only. Usage (from frontend-next/, after
 * `source ~/.nodbusiness-local/env.sh`):
 *   node ../note/2026-11-14-showroom-audit/controls-scan.mjs <out-dir>
 * Exits non-zero when anything is found.
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
const WEB = process.env.SCAN_WEB || 'http://localhost:3002';
const OUT = process.argv[2] || '/tmp/controls-scan';
fs.mkdirSync(OUT, { recursive: true });
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) throw new Error('Local DATABASE_URL required');

const VIEWPORTS = [[360, 780], [390, 844], [768, 1024], [1024, 768]];

/** Runs in the page: returns findings for visible controls. */
function scanPage() {
  const SEL = 'button, a[role="button"], [role="button"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], input[type="checkbox"], input[type="radio"], input[type="color"], select';
  const out = [];
  const seen = new Set();
  const describe = (el) => {
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const cls = (el.getAttribute('class') || '').split(/\s+/).filter((c) => /^(h-|w-|size-|min-h|rounded|p[xy]?-)/.test(c)).slice(0, 6).join(' ');
    return `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''} "${name}" {${cls}}`;
  };
  for (const el of document.querySelectorAll(SEL)) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) continue;
    if (el.closest('[aria-hidden="true"]') && !el.closest('[role="dialog"]')) continue;
    // Visually hidden (screen-reader-only) controls are not touch targets.
    if (r.width <= 2 || r.height <= 2 || st.clip === 'rect(0px, 0px, 0px, 0px)' || /\bsr-only\b/.test(el.getAttribute('class') || '')) continue;
    const key = describe(el);
    if (seen.has(key)) continue;
    seen.add(key);
    // Natural height: what the control would be without a min-height forced on it.
    const prev = el.style.minHeight;
    el.style.minHeight = '0px';
    const natural = el.getBoundingClientRect().height;
    el.style.minHeight = prev;
    const role = el.getAttribute('role');
    const classes = el.getAttribute('class') || '';
    const round = /\brounded-full\b/.test(classes);
    const wCls = classes.match(/(?:^|\s)w-(\d+(?:\.\d+)?)(?=\s|$)/);
    const hCls = classes.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?=\s|$)/);
    const squareByClass = wCls && hCls && wCls[1] === hCls[1];
    if (natural + 4 < r.height && /min/.test('min') && parseFloat(st.minHeight) >= r.height - 1) {
      out.push({ kind: 'STRETCHED', what: key, size: `${Math.round(r.width)}x${Math.round(r.height)} (natural ${Math.round(natural)})` });
      continue;
    }
    if (role === 'switch' && r.height > r.width) out.push({ kind: 'MISSHAPEN', what: key, size: `${Math.round(r.width)}x${Math.round(r.height)}` });
    else if (round && squareByClass && Math.abs(r.width - r.height) > 3) out.push({ kind: 'MISSHAPEN', what: key, size: `${Math.round(r.width)}x${Math.round(r.height)}` });
    // Hit area: the box, or a ::after that enlarges it (.tap-target).
    const after = getComputedStyle(el, '::after');
    let hitW = r.width; let hitH = r.height;
    if (after.content && after.content !== 'none' && after.position === 'absolute') {
      hitW = Math.max(hitW, r.width - parseFloat(after.left || '0') - parseFloat(after.right || '0'));
      hitH = Math.max(hitH, r.height - parseFloat(after.top || '0') - parseFloat(after.bottom || '0'));
    }
    // A label wrapping a native checkbox/radio is its hit area.
    const label = el.closest('label');
    if (label && /^(checkbox|radio)$/.test(el.getAttribute('type') || '')) { const lr = label.getBoundingClientRect(); hitW = Math.max(hitW, lr.width); hitH = Math.max(hitH, lr.height); }
    if (hitW < 24 || hitH < 24) out.push({ kind: 'SMALL', what: key, size: `${Math.round(hitW)}x${Math.round(hitH)}` });
  }
  return out;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const tag = crypto.randomBytes(3).toString('hex');
const pw = `Scan-${crypto.randomBytes(8).toString('hex')}`;
const { rows: [u] } = await pool.query(`INSERT INTO users (email,password_hash,full_name,provider,is_verified,is_demo,is_seed) VALUES ($1,$2,'Scan Owner','local',TRUE,FALSE,FALSE) RETURNING id,email`, [`scan-${tag}@example.test`, await bcrypt.hash(pw, 10)]);
await pool.query(`INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Scan Owner')`, [u.id]);
const { rows: [b] } = await pool.query(`INSERT INTO businesses (owner_id,business_name,business_category,visibility) VALUES ($1,$2,'shop','public') RETURNING id`, [u.id, `Scan Shop ${tag}`]);
await pool.query(`INSERT INTO business_subscriptions (business_id,tier,status,current_period_start,current_period_end) VALUES ($1,'pro','active',NOW(),NOW()+INTERVAL '30 days')`, [b.id]);
const slug = `scan-shop-${tag}`;
const { rows: [site] } = await pool.query(`INSERT INTO showrooms (owner_id,business_id,title,category,sections,status,slug) VALUES ($1,$2,$3,'Business & Commerce',$4,'published',$5) RETURNING id`,
  [u.id, b.id, `Scan Shop ${tag}`, JSON.stringify([{ type: 'hero', title: `Scan Shop ${tag}`, cta: 'Shop', heroBg: '#2563eb', heroBg2: '#7c3aed' }, { type: 'items', items: [{ name: 'Scarf', price: '850 ETB' }] }, { type: 'faq', faqs: [{ question: 'Open Sundays?', answer: 'Yes' }] }, { type: 'contact', phone: '+251911000000', whatsapp: '+251911000000' }]), slug]);

const STUDIO = '/showroom/create?step=3&category=Business+%26+Commerce&template=electronics-appliances&sample=premium';
const PAGES = [
  ['landing', '/landing', null],
  ['feed', '/feed', null],
  ['marketplace', '/marketplace', null],
  ['search', '/search?q=shop', null],
  ['showrooms', '/showrooms', null],
  ['businesses', '/businesses', null],
  ['messages', '/messages', null],
  ['orders', '/orders', null],
  ['settings', '/settings', null],
  ['profile', `/profile/${u.id}`, null],
  ['site', `/showroom/${slug}`, null],
  ['site-owner', `/showrooms/${site.id}`, null],
  ['wizard', '/showroom/create', null],
  ['studio', STUDIO, null],
  ['studio-style', STUDIO, async (p) => { await p.getByRole('button', { name: /Style: colours and lettering/ }).click(); await p.waitForTimeout(400); }],
  ['studio-more', STUDIO, async (p) => { await p.getByRole('button', { name: /More options/ }).click(); await p.waitForTimeout(400); }],
  ['studio-spotlight', STUDIO, async (p) => { await p.getByRole('button', { name: /More options/ }).click(); await p.getByRole('button', { name: /Feed Spotlight/ }).click(); await p.waitForTimeout(800); const c = p.getByRole('radio', { name: /Choose sections/ }); if (await c.count()) await c.check(); await p.waitForTimeout(300); }],
  ['rooms', '/business/rooms', null],
];

const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
const report = [];
try {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(u.email);
  await page.getByLabel(/^password/i).first().fill(pw);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((x) => !x.pathname.startsWith('/login'), { timeout: 20000 });
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    for (const [name, url, action] of PAGES) {
      try {
        await page.goto(`${WEB}${url}`, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(600);
        if (action) await action(page);
        const found = await page.evaluate(scanPage);
        for (const f of found) report.push({ viewport: `${w}x${h}`, page: name, ...f });
        if (found.length && w === 390) await page.screenshot({ path: path.join(OUT, `${name}-${w}.png`) });
      } catch (err) {
        report.push({ viewport: `${w}x${h}`, page: name, kind: 'ERROR', what: String(err.message).split('\n')[0].slice(0, 160), size: '' });
      }
    }
  }
  await ctx.close();
} finally {
  await browser.close();
  await pool.query('DELETE FROM users WHERE id=$1', [u.id]).catch(() => {});
  await pool.end();
}
fs.writeFileSync(path.join(OUT, 'controls-scan.json'), JSON.stringify(report, null, 2));
// Summary: unique control x kind, with the pages and viewports it appears on.
const byKey = new Map();
for (const r of report) {
  const k = `${r.kind} ${r.what}`;
  const e = byKey.get(k) || { kind: r.kind, what: r.what, sizes: new Set(), where: new Set() };
  e.sizes.add(r.size); e.where.add(`${r.page}@${r.viewport.split('x')[0]}`);
  byKey.set(k, e);
}
const counts = report.reduce((a, r) => ({ ...a, [r.kind]: (a[r.kind] || 0) + 1 }), {});
console.log(JSON.stringify(counts));
for (const e of [...byKey.values()].sort((a, b) => a.kind.localeCompare(b.kind))) {
  console.log(`${e.kind.padEnd(9)} ${e.what} | ${[...e.sizes].slice(0, 2).join(', ')} | ${[...e.where].slice(0, 6).join(' ')}${e.where.size > 6 ? ` +${e.where.size - 6}` : ''}`);
}
process.exit(report.length ? 1 : 0);
