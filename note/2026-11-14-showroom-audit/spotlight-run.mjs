/**
 * Real-stack check of the Feed Spotlight dialog and Studio colours
 * (owner's report, 14 Nov 2026). LOCAL stack only (local-stack.sh up).
 * Usage (from frontend-next/, after `source ~/.nodbusiness-local/env.sh`):
 *   node ../note/2026-11-14-showroom-audit/spotlight-run.mjs <screenshot-dir>
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
const WEB = 'http://localhost:3002';
const OUT = process.argv[2] || '/tmp/spotlight-run';
fs.mkdirSync(OUT, { recursive: true });
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) throw new Error('Local DATABASE_URL required');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const results = [];
const check = (name, ok, detail = '') => results.push({ check: name, ok: Boolean(ok), detail: String(detail).slice(0, 300) });
const visible = (loc, ms = 10000) => loc.first().waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);
const inViewport = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return r.height > 120 && r.top >= 0 && r.top < window.innerHeight - 100; }).catch(() => false);

const tag = crypto.randomBytes(3).toString('hex');
const pw = `Spot-${crypto.randomBytes(8).toString('hex')}`;
const { rows: [u] } = await pool.query(`INSERT INTO users (email,password_hash,full_name,provider,is_verified,is_demo,is_seed) VALUES ($1,$2,'Spot Owner','local',TRUE,FALSE,FALSE) RETURNING id, email`, [`spot-${tag}@example.test`, await bcrypt.hash(pw, 10)]);
await pool.query(`INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Spot Owner')`, [u.id]);
const { rows: [b] } = await pool.query(`INSERT INTO businesses (owner_id,business_name,business_category,visibility) VALUES ($1,$2,'shop','public') RETURNING id`, [u.id, `Fashion ${tag}`]);
await pool.query(`INSERT INTO business_subscriptions (business_id,tier,status,current_period_start,current_period_end) VALUES ($1,'pro','active',NOW(),NOW()+INTERVAL '30 days')`, [b.id]);

const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|favicon/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(u.email);
  await page.getByLabel(/^password/i).first().fill(pw);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((x) => !x.pathname.startsWith('/login'), { timeout: 20000 });

  const studio = `${WEB}/showroom/create?step=3&category=Business+%26+Commerce&template=fashion-clothing-store&sample=premium`;
  await page.goto(studio, { waitUntil: 'networkidle' });
  await page.getByLabel('Business name').first().waitFor({ timeout: 20000 });
  await page.getByLabel('Business name').first().fill(`Fashion ${tag}`);

  const openSpotlight = async () => {
    await page.getByRole('button', { name: /More/ }).first().click();
    await page.getByRole('button', { name: /Feed Spotlight/ }).click();
    return visible(page.getByRole('dialog', { name: 'Feed Spotlight' }), 20000);
  };
  check('Spotlight opens as a labelled dialog', await openSpotlight());
  await page.getByRole('radio', { name: /Choose sections/ }).check();
  const boxes = page.getByRole('dialog').getByRole('checkbox');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) if (!(await boxes.nth(i).isChecked())) await boxes.nth(i).check();
  const labels = await boxes.evaluateAll((els) => els.map((e) => e.closest('label')?.querySelector('span')?.textContent?.trim()));
  check('premium sample offers its drawable sections', n >= 6, `${n}: ${labels.join(' | ')}`);
  check('no "What customers say" option', !labels.some((l) => /customers say/i.test(l || '')));
  const pane = page.getByTestId('spotlight-preview-pane');
  check('preview visible while choosing (1280x720)', await inViewport(pane));
  const headInView = await page.locator('#feed-spotlight-title').evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }).catch(() => false);
  check('title stays in view after ticking every section (only the list scrolls)', headInView);
  const tabs = await pane.getByRole('tab').allTextContents();
  const empty = await pane.getByTestId('spotlight-empty-note').textContent().catch(() => '');
  check('every chosen section with content is a tab', tabs.length >= 5 && tabs.length + (empty ? empty.split(',').length : 0) >= n, `tabs=${tabs.join(',')} empty=${empty}`);
  await page.screenshot({ path: path.join(OUT, 'spotlight-1280.png') });

  // Reorder: move the last chosen section first, then the preview follows.
  const lastLabel = labels[n - 1];
  for (let i = 0; i < n - 1; i++) await page.getByRole('button', { name: `Move ${lastLabel} earlier` }).click();
  await page.waitForTimeout(300);
  const tabsAfter = await pane.getByRole('tab').allTextContents();
  check('reordering changes the tab order', tabsAfter.join() !== tabs.join(), `${tabs.join(',')} -> ${tabsAfter.join(',')}`);

  // Unsaved changes: Esc asks first; nothing is sent until Save.
  await page.keyboard.press('Escape');
  check('Esc with unsaved changes asks "Save your changes?"', await visible(page.getByRole('alertdialog', { name: /Save your changes/ }), 2000));
  await page.getByRole('button', { name: 'Keep editing' }).click();
  const { rows: [before] } = await pool.query(`SELECT spotlight_section_ids FROM showrooms WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 1`, [u.id]);
  check('nothing saved before pressing Save', !before || (before.spotlight_section_ids || []).length < 5, JSON.stringify(before));
  const saveBtn = page.getByRole('dialog', { name: 'Feed Spotlight' }).getByRole('button', { name: /^Save/ }).last();
  check('a visible Save button after choosing', await saveBtn.evaluate((el) => { const r = el.getBoundingClientRect(); return r.height >= 40 && r.bottom <= window.innerHeight && r.top >= 0; }).catch(() => false));
  await saveBtn.click();
  check('Save closes the dialog', await page.getByRole('dialog', { name: 'Feed Spotlight' }).waitFor({ state: 'hidden', timeout: 5000 }).then(() => true).catch(() => false));
  await page.waitForTimeout(800);
  const { rows: [saved] } = await pool.query(`SELECT spotlight_mode, spotlight_section_ids FROM showrooms WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 1`, [u.id]);
  check('Save stored the choice in order', saved && saved.spotlight_mode === 'carousel' && saved.spotlight_section_ids.length >= 5, JSON.stringify(saved));
  await openSpotlight();
  const tabsReopen = await page.getByTestId('spotlight-preview-pane').getByRole('tab').allTextContents();
  check('reopened with the same tabs and order', tabsReopen.join() === tabsAfter.join(), tabsReopen.join(','));
  await page.addScriptTag({ path: AXE });
  const ax = await page.evaluate(() => window.axe.run(document.querySelector('[role="dialog"]'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }));
  const bad = ax.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes[0]?.target}`);
  check('Spotlight dialog: no serious or critical WCAG 2.2 AA issues', bad.length === 0, bad.join(' | '));
  await page.keyboard.press('Escape');
  check('Esc with nothing changed closes at once', !(await visible(page.getByRole('dialog', { name: 'Feed Spotlight' }), 1500)));

  // Colours: any colour, live in the site preview.
  await page.getByRole('button', { name: /Style: colours and lettering/ }).click();
  // The current colours are always shown as selected: a preset swatch or the Custom one.
  const selectedPreset = await page.locator('[aria-pressed="true"][aria-label^="Colour "]').count();
  check('Style menu shows the current colours as selected', selectedPreset === 1 || await visible(page.getByTestId('custom-colour-swatch'), 3000), `presets pressed: ${selectedPreset}`);
  await page.getByLabel('Colour 1 code').fill('#ff6600');
  await page.getByLabel('Colour 1 code').press('Enter');
  await page.getByLabel('Colour 2 code').fill('#222222');
  await page.getByLabel('Colour 2 code').press('Enter');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'colours-1280.png') });
  const heroBg = await page.locator('#section-0').first().evaluate((el) => getComputedStyle(el).backgroundImage).catch(() => '');
  // Colour 1 is #ff6600, darkened only as far as white text needs (still orange: red > green > blue).
  const [r, g, bl] = (heroBg.match(/rgb\((\d+), (\d+), (\d+)\)/) || []).slice(1).map(Number);
  check('site preview uses the custom colours', r > g && g > bl && r >= 150 && /34, 34, 34/.test(heroBg), heroBg);
  check('Custom swatch now shown as selected', await visible(page.getByTestId('custom-colour-swatch'), 3000));
  await page.keyboard.press('Escape');

  // Phone: the preview stays in view while choosing.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await openSpotlight();
  check('preview visible while choosing (390x844 phone)', await inViewport(page.getByTestId('spotlight-preview-pane')));
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check('no sideways scroll on the phone', sw <= 390, sw);
  await page.screenshot({ path: path.join(OUT, 'spotlight-390.png') });
  check('no console errors in Studio or the dialog', errors.length === 0, errors.join(' || '));
  await ctx.close();
} catch (err) {
  check('run finished without crashing', false, err?.stack || err);
} finally {
  await browser.close();
  await pool.query('DELETE FROM users WHERE id=$1', [u.id]).catch(() => {});
  await pool.end();
}
const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed, all: results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.check} ${r.ok ? '' : r.detail}`) }, null, 2));
process.exit(failed.length ? 1 : 0);
