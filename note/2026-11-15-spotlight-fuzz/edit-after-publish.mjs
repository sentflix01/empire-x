/**
 * "Publish, come back another time, change any part or start over" — the
 * owner's return journey on the real stack (owner, 15 Nov 2026).
 *
 * Every visit uses a FRESH browser context (another day / another device), so
 * nothing carries over except what the server stored. After every publish a
 * signed-out visitor opens the public page and we check what they see.
 *
 *   V1  Studio from scratch → name, one line → Publish.
 *   V2  New device: site page → Edit → Studio shows the published content →
 *       change the one line, add About us with text, remove a section, move a
 *       section, pick a custom colour, choose Spotlight tabs + Save → Update.
 *   V3  Edit without publishing, leave → visitors still see V2 (no leak);
 *       reopen on the same device → the unpublished change is still there to
 *       finish (or discard).
 *   V4  Second device edits and updates; back on the V3 device the newer
 *       published version must win over its old local copy.
 *   V5  Start over (More → Clear draft) → rebuild with a new name → Update:
 *       same web address, old content gone for visitors.
 *   V6  Unpublish → visitors see "unavailable"; Publish again → back.
 *
 * LOCAL stack only. Usage (from frontend-next/, after
 * `source ~/.nodbusiness-local/env.sh`):
 *   node ../note/2026-11-15-spotlight-fuzz/edit-after-publish.mjs <out-dir>
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
const OUT = process.argv[2] || '/tmp/edit-after-publish';
const W = Number(process.env.WIDTH || 1366); const H = Number(process.env.HEIGHT || 900);
fs.mkdirSync(OUT, { recursive: true });
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) throw new Error('Local DATABASE_URL required');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const results = [];
const check = (name, ok, detail = '') => { results.push({ check: name, ok: Boolean(ok), detail: String(detail).slice(0, 300) }); if (!ok) console.log(`FAIL ${name} ${String(detail).slice(0, 300)}`); };
const tag = crypto.randomBytes(3).toString('hex');
const pw = `Ed-${crypto.randomBytes(8).toString('hex')}`;
const { rows: [u] } = await pool.query(`INSERT INTO users (email,password_hash,full_name,provider,is_verified,is_demo,is_seed) VALUES ($1,$2,'Return Owner','local',TRUE,FALSE,FALSE) RETURNING id,email`, [`ret-${tag}@example.test`, await bcrypt.hash(pw, 10)]);
await pool.query(`INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Return Owner')`, [u.id]);
const { rows: [b] } = await pool.query(`INSERT INTO businesses (owner_id,business_name,business_category,visibility) VALUES ($1,$2,'shop','public') RETURNING id`, [u.id, `Selam Crafts ${tag}`]);
await pool.query(`INSERT INTO business_subscriptions (business_id,tier,status,current_period_start,current_period_end) VALUES ($1,'pro','active',NOW(),NOW()+INTERVAL '30 days')`, [b.id]);

const row = async () => (await pool.query(`SELECT id, slug, status, title, sections, spotlight_mode, spotlight_section_ids, theme_color FROM showrooms WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 1`, [u.id])).rows[0];
const sectionsOf = (r) => { try { return typeof r.sections === 'string' ? JSON.parse(r.sections) : r.sections; } catch { return []; } };

const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
const consoleErrors = [];
async function device(name) {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: W, height: H } });
  // The Next.js dev-tools badge (dev server only, never in production) can sit on buttons.
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = 'nextjs-portal{display:none!important}'; document.head.appendChild(st); }); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => consoleErrors.push(`${name}: ${e.message}`));
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(u.email);
  await page.getByLabel(/^password/i).first().fill(pw);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((x) => !x.pathname.startsWith('/login'), { timeout: 20000 });
  return { ctx, page };
}
async function visitor(slug) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${WEB}/showroom/${slug}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const text = await page.evaluate(() => document.body.innerText);
  const heroBg = await page.evaluate(() => { const h = document.querySelector('[id^="section-"]'); return h ? getComputedStyle(h).backgroundImage + getComputedStyle(h).backgroundColor : ''; });
  await page.screenshot({ path: path.join(OUT, `visitor-${Date.now()}.png`), fullPage: false });
  await ctx.close();
  return { text, heroBg };
}
const field = (page, label) => page.getByLabel(label, { exact: true }).first();
/** Studio shows Sections and Edit as tabs on narrower widths; switch like a user would. */
async function showTab(page, name) {
  const tab = page.getByRole('tab', { name: new RegExp(`^${name}`) });
  if (await tab.count() && await tab.first().isVisible()) { await tab.first().click(); await page.waitForTimeout(300); }
}
async function openEdit(page, id) {
  await page.goto(`${WEB}/showrooms/${id}`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /^Edit/ }).first().click();
  await page.waitForURL(/\/showroom\/create\?edit=/, { timeout: 20000 });
  await field(page, 'Business name').waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
}
async function publishAndWait(page, label) {
  const btn = page.getByRole('button', { name: label, exact: true });
  await btn.click();
  await page.waitForURL(/\/showrooms\/[0-9a-f-]+/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

try {
  // ── V1 ─ publish from scratch ─────────────────────────────────────────────
  const d1 = await device('device-1');
  let p = d1.page;
  await p.goto(`${WEB}/showroom/create`, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /Business & Commerce/i }).click();
  await p.getByRole('button', { name: /Start from scratch/i }).click();
  await field(p, 'Business name').waitFor({ timeout: 20000 });
  await field(p, 'Business name').fill(`Selam Crafts ${tag}`);
  const oneLine = field(p, 'One line about you');
  if (await oneLine.count()) await oneLine.fill('Handmade scarves from Addis.');
  await p.waitForTimeout(400);
  await publishAndWait(p, 'Publish');
  let r = await row();
  check('V1 published from scratch', r?.status === 'published', JSON.stringify({ status: r?.status, slug: r?.slug }));
  const slug = r.slug; const siteId = r.id;
  const v1Sections = sectionsOf(r).map((s) => s.type);
  let seen = await visitor(slug);
  check('V1 visitor sees the site', seen.text.includes(`Selam Crafts ${tag}`) && seen.text.includes('Handmade scarves from Addis.'), seen.text.slice(0, 160));
  await d1.ctx.close();

  // ── V2 ─ another day, another device: change parts ───────────────────────
  const d2 = await device('device-2');
  p = d2.page;
  await openEdit(p, siteId);
  check('V2 Studio opens with the published name', (await field(p, 'Business name').inputValue()) === `Selam Crafts ${tag}`);
  check('V2 Studio opens with the published one line', (await field(p, 'One line about you').inputValue()) === 'Handmade scarves from Addis.');
  check('V2 button reads Update for a published site', await p.getByRole('button', { name: 'Update', exact: true }).isVisible());
  await field(p, 'One line about you').fill('Handmade scarves and shawls from Addis.');
  // Add About us with text.
  await showTab(p, 'Sections');
  const addAbout = p.getByRole('button', { name: 'Add About us' });
  if (await addAbout.count()) { await addAbout.first().click(); await p.waitForTimeout(300); }
  // Remove the last removable section that is not hero/about, and move About up.
  const removable = v1Sections.filter((t) => !['hero', 'about'].includes(t));
  const removedType = removable[removable.length - 1];
  const removeBtns = p.getByRole('button', { name: /^Remove / });
  const removeNames = await removeBtns.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const removeName = removeNames.filter((n) => !/Top of your page|About us/.test(n || '')).pop();
  if (removeName) await p.getByRole('button', { name: removeName }).click();
  await p.waitForTimeout(300);
  const moveAbout = p.getByRole('button', { name: 'Move About us up' });
  if (await moveAbout.count() && await moveAbout.isEnabled()) await moveAbout.click();
  await showTab(p, 'Edit');
  await field(p, 'Your story').fill(`We weave every scarf by hand ${tag}.`);
  // Custom colour.
  await p.getByRole('button', { name: /Style: colours and lettering/ }).click();
  const code = p.getByLabel('Colour 1 code');
  await code.fill('#0f766e'); await code.press('Enter');
  await p.keyboard.press('Escape');
  // Spotlight: choose About us and save.
  await p.getByRole('button', { name: /More options/ }).click();
  await p.getByRole('button', { name: /^Feed Spotlight/ }).click();
  const dlg = p.getByRole('dialog', { name: 'Feed Spotlight' });
  await dlg.waitFor({ timeout: 20000 });
  await dlg.getByRole('radio', { name: /Choose sections/ }).check();
  const aboutBox = dlg.getByRole('checkbox', { name: /About us/ });
  if (!(await aboutBox.isChecked())) await aboutBox.check();
  await dlg.getByRole('button', { name: /^Save/ }).last().click();
  await dlg.waitFor({ state: 'hidden', timeout: 10000 });
  await p.screenshot({ path: path.join(OUT, 'v2-studio-before-update.png') });
  await publishAndWait(p, 'Update');
  r = await row();
  const v2 = sectionsOf(r);
  check('V2 same web address after Update', r.slug === slug, `${slug} -> ${r.slug}`);
  check('V2 still published', r.status === 'published', r.status);
  check('V2 About us added with the story', v2.some((s) => s.type === 'about' && String(s.aboutDesc || '').includes(tag)), JSON.stringify(v2.map((s) => s.type)));
  check('V2 section removed', !removeName || !v2.some((s) => s.type === removedType), `${removeName} / ${JSON.stringify(v2.map((s) => s.type))}`);
  check('V2 colour saved', String(r.theme_color || '').toLowerCase() === '#0f766e' || v2.some((s) => String(s.heroBg || '').toLowerCase() === '#0f766e'), `${r.theme_color} / ${v2.find((s) => s.type === 'hero')?.heroBg}`);
  const ids = Array.isArray(r.spotlight_section_ids) ? r.spotlight_section_ids : JSON.parse(r.spotlight_section_ids || '[]');
  check('V2 Spotlight choice saved', ids.includes('about') && ['single', 'carousel'].includes(r.spotlight_mode), JSON.stringify({ mode: r.spotlight_mode, ids }));
  seen = await visitor(slug);
  check('V2 visitor sees the new one line', seen.text.includes('Handmade scarves and shawls from Addis.'), seen.text.slice(0, 200));
  check('V2 visitor sees the About story', seen.text.includes(`We weave every scarf by hand ${tag}.`));
  check('V2 visitor sees the new colour', /15,\s*118,\s*110|0f766e/i.test(seen.heroBg) || /rgb\(1[0-9],\s*1[01][0-9],\s*1[01][0-9]\)/.test(seen.heroBg), seen.heroBg.slice(0, 160));

  // ── V3 ─ edit, leave without publishing ───────────────────────────────────
  await openEdit(p, siteId);
  await field(p, 'One line about you').fill('UNPUBLISHED CHANGE');
  await p.waitForTimeout(2200); // device auto-save
  await p.goto(`${WEB}/feed`, { waitUntil: 'networkidle' });
  seen = await visitor(slug);
  check('V3 unpublished edit does not reach visitors', !seen.text.includes('UNPUBLISHED CHANGE') && seen.text.includes('Handmade scarves and shawls from Addis.'));
  await openEdit(p, siteId);
  const resumed = await field(p, 'One line about you').inputValue();
  check('V3 same device: the unfinished change is offered back', resumed === 'UNPUBLISHED CHANGE', resumed);
  check('V3 Studio says the change is not live yet', await p.getByTestId('studio-device-changes').getByText(/Not live yet/).isVisible().catch(() => false));
  await p.getByRole('button', { name: 'Discard changes' }).click();
  await p.waitForTimeout(300);
  check('V3 Discard brings back the live version', (await field(p, 'One line about you').inputValue()) === 'Handmade scarves and shawls from Addis.');
  await field(p, 'One line about you').fill('UNPUBLISHED CHANGE');
  await p.waitForTimeout(2200);
  await p.goto(`${WEB}/feed`, { waitUntil: 'networkidle' });
  const newSite = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('nodbusiness_builder_draft:') && !k.includes(':edit:') && !k.endsWith(':server_id')).map((k) => localStorage.getItem(k)).join(''));
  check('V3 a live site\'s changes never land in the new-site draft', !newSite.includes('UNPUBLISHED CHANGE'), newSite.slice(0, 120));

  // ── V4 ─ second device updates; first device must not overwrite it ───────
  const d3 = await device('device-3');
  await openEdit(d3.page, siteId);
  const onOther = await field(d3.page, 'One line about you').inputValue();
  check('V4 other device opens the published version (not another device\'s draft)', onOther === 'Handmade scarves and shawls from Addis.', onOther);
  await field(d3.page, 'One line about you').fill('Updated from my phone.');
  await d3.page.waitForTimeout(300);
  await publishAndWait(d3.page, 'Update');
  await d3.ctx.close();
  seen = await visitor(slug);
  check('V4 visitor sees the second device\'s update', seen.text.includes('Updated from my phone.'));
  await openEdit(p, siteId);
  const back = await field(p, 'One line about you').inputValue();
  check('V4 back on the first device: the newer live version opens', back === 'Updated from my phone.', back);
  check('V4 the older device changes are offered, not lost', await p.getByTestId('studio-device-changes').getByText(/Updated elsewhere/).isVisible().catch(() => false));
  await p.getByRole('button', { name: 'Use my older changes' }).click();
  await p.waitForTimeout(300);
  check('V4 "Use my older changes" restores them', (await field(p, 'One line about you').inputValue()) === 'UNPUBLISHED CHANGE');
  await p.getByRole('button', { name: 'Discard changes' }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'v4-device1-reopen.png') });

  // ── V5 ─ start over, rebuild, update ──────────────────────────────────────
  await p.getByRole('button', { name: /More options/ }).click();
  await p.getByRole('button', { name: /Clear draft|Start over/ }).click();
  await p.getByRole('button', { name: /^Clear$/ }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, 'v5-after-clear.png') });
  const afterClear = await field(p, 'Business name').inputValue();
  const leftovers = await p.evaluate(() => document.body.innerText.match(/Signature Dish|Product One|Your Business Name/g) || []);
  check('V5 start over gives a blank canvas (no sample content)', !leftovers.includes('Signature Dish') && !leftovers.includes('Product One'), `name="${afterClear}" leftovers=${leftovers.join(',')}`);
  await field(p, 'Business name').fill(`Selam Weaving ${tag}`);
  await field(p, 'One line about you').fill('A new start.');
  await p.waitForTimeout(300);
  await publishAndWait(p, 'Update');
  r = await row();
  check('V5 same web address after starting over', r.slug === slug, `${slug} -> ${r.slug}`);
  seen = await visitor(slug);
  check('V5 visitor sees the rebuilt site', seen.text.includes(`Selam Weaving ${tag}`) && seen.text.includes('A new start.'));
  check('V5 old content gone for visitors', !seen.text.includes('Updated from my phone.') && !seen.text.includes(`We weave every scarf by hand ${tag}.`), seen.text.slice(0, 200));
  const stillOne = (await pool.query('SELECT COUNT(*)::int AS n FROM showrooms WHERE owner_id=$1', [u.id])).rows[0].n;
  check('V5 no duplicate site was created', stillOne === 1, stillOne);

  // ── V6 ─ unpublish / publish again ────────────────────────────────────────
  await p.goto(`${WEB}/showrooms/${siteId}`, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Unpublish' }).click();
  await p.waitForTimeout(1200);
  seen = await visitor(slug);
  check('V6 unpublished: visitors no longer see it', !seen.text.includes('A new start.'), seen.text.slice(0, 160));
  await p.getByRole('button', { name: 'Publish again' }).click();
  await p.waitForTimeout(1500);
  seen = await visitor(slug);
  check('V6 published again: visitors see it', seen.text.includes('A new start.'));
  await d2.ctx.close();
  check('no page errors', consoleErrors.length === 0, consoleErrors.join(' || '));
} catch (err) {
  check('journey finished without crashing', false, String(err?.message || err).split('\n').slice(0, 3).join(' ') + ' @ ' + String(err?.stack || '').split('\n').find((l) => l.includes('edit-after-publish.mjs')));
  for (const ctx of browser.contexts()) for (const pg of ctx.pages()) await pg.screenshot({ path: path.join(OUT, `crash-${Date.now()}.png`) }).catch(() => {});
} finally {
  await browser.close();
  await pool.query('DELETE FROM users WHERE id=$1', [u.id]).catch(() => {});
  await pool.end();
}
fs.writeFileSync(path.join(OUT, 'edit-after-publish.json'), JSON.stringify(results, null, 2));
for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'} ${x.check}${x.ok ? '' : ` — ${x.detail}`}`);
process.exit(results.every((x) => x.ok) ? 0 : 1);
