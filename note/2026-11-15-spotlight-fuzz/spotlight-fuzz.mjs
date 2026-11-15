/**
 * Feed Spotlight fuzz test (owner, 15 Nov 2026: "when I tick back and forth,
 * the spotlight preview disappears").
 *
 * Drives the Feed Spotlight dialog with random action sequences (tick/untick,
 * move up/down, click a preview tab, switch mode, Cancel and reopen) and after
 * EVERY action checks the invariants a professional editor must keep:
 *   I1 with at least one ticked section that has content, the preview shows
 *      the strip (never the "hasn't added anything" card or a blank);
 *   I2 the number of tabs equals the ticked sections that have content
 *      (rows without the "No content yet" hint);
 *   I3 the header count ("N tabs" / "1 section") agrees with the strip;
 *   I4 the strip stays inside the visible preview pane.
 *
 * Page setups: the premium sample, and a saved site whose sections hold
 * half-filled rows (a number with no value, a service with no name, a question
 * with no text) — content checks and card drawing must agree on those.
 *
 * LOCAL stack only. Usage (from frontend-next/, after
 * `source ~/.nodbusiness-local/env.sh`):
 *   node ../note/2026-11-15-spotlight-fuzz/spotlight-fuzz.mjs <out-dir> [sequences] [steps]
 * Exits non-zero when an invariant breaks; prints the failing sequence.
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
const OUT = process.argv[2] || '/tmp/spotlight-fuzz';
const SEQUENCES = Number(process.argv[3] || 12);
const STEPS = Number(process.argv[4] || 18);
const VIEWPORTS = (process.env.VIEWPORTS || '390x844,768x563,1366x768').split(',').map((v) => v.split('x').map(Number));
fs.mkdirSync(OUT, { recursive: true });
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) throw new Error('Local DATABASE_URL required');

// Seeded random, so a failure can be replayed.
let seed = Number(process.env.SEED || 20261115);
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (n) => Math.floor(rand() * n);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const tag = crypto.randomBytes(3).toString('hex');
const pw = `Fz-${crypto.randomBytes(8).toString('hex')}`;
const { rows: [u] } = await pool.query(`INSERT INTO users (email,password_hash,full_name,provider,is_verified,is_demo,is_seed) VALUES ($1,$2,'Fuzz Owner','local',TRUE,FALSE,FALSE) RETURNING id,email`, [`fuzz-${tag}@example.test`, await bcrypt.hash(pw, 10)]);
await pool.query(`INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Fuzz Owner')`, [u.id]);
const { rows: [b] } = await pool.query(`INSERT INTO businesses (owner_id,business_name,business_category,visibility) VALUES ($1,$2,'shop','public') RETURNING id`, [u.id, `Fuzz Shop ${tag}`]);
await pool.query(`INSERT INTO business_subscriptions (business_id,tier,status,current_period_start,current_period_end) VALUES ($1,'pro','active',NOW(),NOW()+INTERVAL '30 days')`, [b.id]);
// A saved site with half-filled rows: each of these sections "has rows" but
// some rows have no text the strip can draw.
const halfFilled = [
  { type: 'hero', title: `Fuzz Shop ${tag}`, cta: 'Shop', heroBg: '#2563eb', heroBg2: '#7c3aed' },
  { type: 'about', aboutTitle: 'About us', aboutDesc: 'We make scarves by hand.' },
  { type: 'items', items: [{ name: 'Scarf', price: '850 ETB' }] },
  { type: 'stats', stats: [{ number: '', label: 'Customers' }] },
  { type: 'services', services: [{ name: '', price: '' }] },
  { type: 'faq', faqs: [{ question: '', answer: '' }] },
  { type: 'team', members: [{ name: 'Selam', role: 'Founder' }] },
  { type: 'contact', phone: '+251911000000' },
];
const { rows: [site] } = await pool.query(`INSERT INTO showrooms (owner_id,business_id,title,category,sections,status,slug) VALUES ($1,$2,$3,'Business & Commerce',$4,'draft',$5) RETURNING id`,
  [u.id, b.id, `Fuzz Shop ${tag}`, JSON.stringify(halfFilled), `fuzz-shop-${tag}`]);

const SETUPS = [
  ['premium-sample', '/showroom/create?step=3&category=Business+%26+Commerce&template=fashion-clothing-store&sample=premium'],
  ['half-filled', `/showroom/create?edit=${site.id}`],
];

/** In-page: the state the invariants are checked on. */
function readState() {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="feed-spotlight-title"]');
  if (!dialog) return { open: false };
  const rows = [...dialog.querySelectorAll('input[type="checkbox"]')].map((c) => {
    const row = c.closest('label') || c.parentElement;
    const text = (row?.textContent || '').replace(/\s+/g, ' ');
    return { checked: c.checked, empty: /No content yet/i.test(text) };
  });
  const chooseMode = dialog.querySelector('input[type="radio"][value="chosen"], [role="radio"][data-value="chosen"]');
  const radios = [...dialog.querySelectorAll('input[type="radio"]')];
  const chosenRadio = radios.find((r) => /Choose sections/.test((r.closest('label') || r.parentElement)?.textContent || ''));
  const pane = dialog.querySelector('[data-testid="spotlight-preview-pane"]') || document.querySelector('[data-testid="spotlight-preview-pane"]');
  const strip = pane?.querySelector('section[aria-label^="Spotlight:"]');
  const emptyCard = pane?.querySelector('section[aria-label="About this business"]');
  const skeleton = pane?.querySelector('section[aria-hidden="true"].animate-pulse');
  const tabs = strip ? [...strip.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()) : [];
  const header = [...(pane?.querySelectorAll('p') || [])].map((p) => p.textContent.trim()).find((t) => /^(\d+ tabs|1 section|Automatic mode|Spotlight off)$/.test(t)) || '';
  let stripVisible = false;
  if (strip && pane) {
    const s = strip.getBoundingClientRect(); const p = pane.getBoundingClientRect();
    stripVisible = s.height > 0 && s.bottom > p.top + 20 && s.top < p.bottom - 20;
  }
  return {
    open: true,
    chosen: Boolean(chosenRadio?.checked),
    rows,
    tabs,
    single: Boolean(strip) && tabs.length === 0,
    stripShown: Boolean(strip),
    emptyCard: Boolean(emptyCard),
    skeleton: Boolean(skeleton),
    header,
    stripVisible,
    chooseMode: Boolean(chooseMode),
  };
}

function check(st) {
  const problems = [];
  if (!st.open) return ['dialog closed unexpectedly'];
  if (!st.chosen) return problems; // Automatic / Off: no tab invariants
  const expected = st.rows.filter((r) => r.checked && !r.empty).length;
  const drawn = st.stripShown ? Math.max(st.tabs.length, 1) : 0;
  if (expected > 0 && !st.stripShown) problems.push(`I1 strip missing (${st.emptyCard ? 'empty-state card' : st.skeleton ? 'loading skeleton' : 'nothing'}) with ${expected} ticked section(s) that have content`);
  if (expected > 1 && st.stripShown && st.tabs.length !== expected) problems.push(`I2 ${st.tabs.length} tabs for ${expected} ticked sections with content`);
  if (expected === 1 && st.stripShown && st.tabs.length > 1) problems.push(`I2 ${st.tabs.length} tabs for 1 ticked section`);
  const want = expected > 1 ? `${expected} tabs` : expected === 1 ? '1 section' : 'Automatic mode';
  if (st.header && st.header !== want) problems.push(`I3 header "${st.header}" but expected "${want}" (strip draws ${drawn})`);
  if (st.stripShown && !st.stripVisible) problems.push('I4 strip scrolled out of the preview pane');
  return problems;
}

const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
const failures = [];
let actionsRun = 0;
try {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(u.email);
  await page.getByLabel(/^password/i).first().fill(pw);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((x) => !x.pathname.startsWith('/login'), { timeout: 20000 });

  const dialog = () => page.getByRole('dialog', { name: 'Feed Spotlight' });
  const open = async () => {
    await page.getByRole('button', { name: /More options/ }).click();
    await page.getByRole('button', { name: /^Feed Spotlight/ }).click();
    await dialog().waitFor({ timeout: 20000 });
  };

  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    for (const [setup, url] of SETUPS) {
      for (let seq = 0; seq < SEQUENCES; seq++) {
        await page.goto(`${WEB}${url}`, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(500);
        await open();
        await dialog().getByRole('radio', { name: /Choose sections/ }).check();
        const log = [`${setup}@${w}x${h} seq ${seq}: choose`];
        for (let step = 0; step < STEPS; step++) {
          const boxes = dialog().getByRole('checkbox');
          const n = await boxes.count();
          const r = rand();
          let did = '';
          if (r < 0.55 && n) { const i = pick(n); await boxes.nth(i).click(); did = `toggle row ${i}`; }
          else if (r < 0.7) {
            const moves = dialog().getByRole('button', { name: /^Move .* (earlier|later)$/ });
            const m = await moves.count();
            const enabled = [];
            for (let i = 0; i < m; i++) if (await moves.nth(i).isEnabled()) enabled.push(i);
            if (enabled.length) { const i = enabled[pick(enabled.length)]; did = `move ${await moves.nth(i).getAttribute('aria-label')}`; await moves.nth(i).click(); }
          } else if (r < 0.88) {
            const tabs = page.getByTestId('spotlight-preview-pane').getByRole('tab');
            const t = await tabs.count();
            if (t) { const i = pick(t); did = `click preview tab ${i}`; await tabs.nth(i).click(); }
          } else if (r < 0.94) {
            await dialog().getByRole('radio', { name: /Automatic/ }).check(); did = 'automatic';
            await page.waitForTimeout(60);
            await dialog().getByRole('radio', { name: /Choose sections/ }).check(); did += ' → choose';
          } else {
            // Cancel (discard if asked) and reopen: the saved choice must come back intact.
            await dialog().getByRole('button', { name: 'Cancel' }).click();
            await open();
            if (!(await dialog().getByRole('radio', { name: /Choose sections/ }).isChecked())) await dialog().getByRole('radio', { name: /Choose sections/ }).check();
            did = 'cancel + reopen';
          }
          if (!did) continue;
          actionsRun++;
          log.push(did);
          await page.waitForTimeout(120);
          const st = await page.evaluate(readState);
          const problems = check(st);
          if (errors.length) problems.push(`page error: ${errors.splice(0).join(' | ').slice(0, 200)}`);
          if (problems.length) {
            const shot = path.join(OUT, `fail-${failures.length + 1}-${setup}-${w}.png`);
            await page.screenshot({ path: shot });
            failures.push({ where: `${setup}@${w}x${h}`, sequence: log.slice(), problems, state: { tabs: st.tabs, header: st.header, rows: st.rows }, screenshot: shot });
            break; // next sequence
          }
        }
      }
    }
  }
  await ctx.close();
} finally {
  await browser.close();
  await pool.query('DELETE FROM users WHERE id=$1', [u.id]).catch(() => {});
  await pool.end();
}
fs.writeFileSync(path.join(OUT, 'spotlight-fuzz.json'), JSON.stringify(failures, null, 2));
console.log(JSON.stringify({ actions: actionsRun, failures: failures.length }));
const kinds = {};
for (const f of failures) for (const p of f.problems) { const k = p.slice(0, 2); kinds[k] = (kinds[k] || 0) + 1; }
console.log(JSON.stringify(kinds));
for (const f of failures.slice(0, 8)) console.log(`\n${f.where}: ${f.problems.join('; ')}\n  ${f.sequence.join(' → ')}\n  tabs=${JSON.stringify(f.state.tabs)} header="${f.state.header}"`);
process.exit(failures.length ? 1 : 0);
