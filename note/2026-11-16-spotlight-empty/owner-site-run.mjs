/**
 * Real-stack replay of the owner's report (16 Nov 2026): a live site with
 * Spotlight tabs Offer, Video, About, Why choose us, where only Video has
 * content (the offer has no words and ended 28 Oct; About and Why us are
 * empty). Ticking looked like it did nothing. LOCAL stack only.
 * Usage (from frontend-next/, after `source ~/.nodbusiness-local/env.sh`):
 *   node ../note/2026-11-16-spotlight-empty/owner-site-run.mjs <screenshot-dir>
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
const WEB = 'http://localhost:3002';
const OUT = process.argv[2] || '/tmp/spotlight-empty';
fs.mkdirSync(OUT, { recursive: true });
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) throw new Error('Local DATABASE_URL required');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const results = [];
const check = (name, ok, detail = '') => results.push({ check: name, ok: Boolean(ok), detail: String(detail).slice(0, 300) });

// The owner's site as stored on production (public data, read-only), same shape.
const SECTIONS = [
  { type: 'hero', title: 'የህፃናት መጫወቻ', subtitle: 'Premium toys for children.', cta: 'Contact Us', heroBg: '#2563EB', heroBg2: '#7C3AED' },
  { type: 'offer', offerTitle: '', offerDesc: '', offerPhoto: '', offerEnds: '2026-10-28', offerBtn: 'እንዳያመልጥዎ' },
  { type: 'video', vidTitle: 'ስለኛ ማወቅ ከፈለጉ', vidUrl: 'https://youtu.be/ooQfMOk-7Rk', vidDesc: 'አብረን እንጃጅ' },
  { type: 'about', aboutTitle: '', aboutDesc: '', aboutImage: '' },
  { type: 'features', featTitle: '', features: [] },
];
const tag = crypto.randomBytes(3).toString('hex');
const pw = `Spot-${crypto.randomBytes(8).toString('hex')}`;
const { rows: [u] } = await pool.query(`INSERT INTO users (email,password_hash,full_name,provider,is_verified,is_demo,is_seed) VALUES ($1,$2,'Toy Owner','local',TRUE,FALSE,FALSE) RETURNING id, email`, [`toys-${tag}@example.test`, await bcrypt.hash(pw, 10)]);
await pool.query(`INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Toy Owner')`, [u.id]);
const { rows: [b] } = await pool.query(`INSERT INTO businesses (owner_id,business_name,business_category,visibility) VALUES ($1,$2,'shop','public') RETURNING id`, [u.id, `Toys ${tag}`]);
await pool.query(`INSERT INTO business_subscriptions (business_id,tier,status,current_period_start,current_period_end) VALUES ($1,'pro','active',NOW(),NOW()+INTERVAL '30 days')`, [b.id]);
const { rows: [site] } = await pool.query(
  `INSERT INTO showrooms (owner_id,business_id,title,category,sections,status,slug,spotlight_mode,spotlight_section_ids)
   VALUES ($1,$2,$3,'Business & Commerce',$4,'published',$5,'carousel','["offer","video","about","features"]') RETURNING id`,
  [u.id, b.id, `የህፃናት መጫወቻ ${tag}`, JSON.stringify(SECTIONS), `toys-${tag}`],
);

const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
try {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(u.email);
  await page.getByLabel(/^password/i).first().fill(pw);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((x) => !x.pathname.startsWith('/login'), { timeout: 20000 });

  await page.goto(`${WEB}/showroom/create?edit=${site.id}`, { waitUntil: 'networkidle' });
  await page.getByLabel('Business name').first().waitFor({ timeout: 20000 });
  const openSpotlight = async () => {
    await page.getByRole('button', { name: /More/ }).first().click();
    await page.getByRole('button', { name: /Feed Spotlight/ }).click();
    await page.getByRole('dialog', { name: 'Feed Spotlight' }).waitFor({ timeout: 20000 });
  };
  await openSpotlight();
  const dlg = page.getByRole('dialog', { name: 'Feed Spotlight' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '1-spotlight-owner-site.png') });
  const missing = async (t) => (await dlg.getByTestId(`spotlight-missing-${t}`).textContent().catch(() => '')) ?? '';
  check('Offer row says what it needs', /Write the offer/.test(await missing('offer')), await missing('offer'));
  check('About row says what it needs', /Write your story/.test(await missing('about')), await missing('about'));
  check('Why choose us row says what it needs', /Add at least one reason/.test(await missing('features')), await missing('features'));
  check('Video shows as a tab (has content)', (await dlg.getByTestId('spotlight-missing-video').count()) === 0);
  const waiting = await dlg.getByTestId('spotlight-empty-note').textContent().catch(() => '');
  check('Preview lists the 3 ticked sections still waiting', /not on your card yet \(3\)/.test(waiting ?? ''), waiting);

  // Fill it in → About form, focused
  await dlg.getByRole('button', { name: 'Fill in About us' }).first().click();
  await dlg.waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(800);
  const focusedId = await page.evaluate(() => document.activeElement?.id ?? '');
  check('"Fill it in" opens the About form with its first field focused', /builder-about-/.test(focusedId), focusedId);
  await page.screenshot({ path: path.join(OUT, '2-about-form-opened.png') });
  await page.locator('#builder-about-aboutDesc').fill('የልጆች መጫወቻዎች ከ2010 ጀምሮ። Safe toys for every age.');
  await page.locator('#builder-features-featTitle').scrollIntoViewIfNeeded().catch(() => {});

  // Reopen: About is now a tab in the preview.
  await openSpotlight();
  await page.waitForTimeout(800);
  const tabs = await dlg.getByRole('tab').allTextContents();
  check('After filling About, the preview shows 2 tabs (Video, About)', tabs.length === 2, tabs.join(' | '));
  await page.screenshot({ path: path.join(OUT, '3-two-tabs-after-fill.png') });
  const unpub = await dlg.getByTestId('spotlight-unpublished-note').count();
  check('Preview says to tap Update for the live card', unpub === 1);
  await dlg.getByRole('button', { name: 'Close Feed Spotlight' }).click();

  // Publish (Update) and check the real feed card.
  await page.getByRole('button', { name: /^Update/ }).first().click();
  await page.waitForTimeout(3000);
  const { rows: [saved] } = await pool.query('SELECT sections FROM showrooms WHERE id=$1', [site.id]);
  const savedAbout = (typeof saved.sections === 'string' ? JSON.parse(saved.sections) : saved.sections).find((x) => x.type === 'about');
  check('Update saved the new About story', /Safe toys/.test(savedAbout?.aboutDesc ?? ''), savedAbout?.aboutDesc);
  // The Business feed as a visitor sees it (guests get the Business feed).
  const guest = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  await guest.goto(`${WEB}/feed`, { waitUntil: 'networkidle' });
  // Newest first: the replayed site is the first card in a fresh local feed.
  await guest.getByText(`የህፃናት መጫወቻ ${tag}`).first().waitFor({ timeout: 20000 }).catch(() => {});
  const card = guest.locator('body');
  await guest.getByRole('tablist', { name: 'Spotlight sections' }).first().scrollIntoViewIfNeeded().catch(() => {});
  await guest.waitForTimeout(1500);
  const cardTabs = await card.getByRole('tablist', { name: 'Spotlight sections' }).first().getByRole('tab').allTextContents().catch(() => []);
  check('Feed card shows the tabs with content (Video, About)', cardTabs.join('|') === 'Video|About', cardTabs.join(' | '));
  await guest.screenshot({ path: path.join(OUT, '4-feed-card.png') });
  check('No page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  await pool.query('DELETE FROM users WHERE id=$1', [u.id]);
  await pool.end();
}
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.check}${r.detail ? ` — ${r.detail}` : ''}`);
console.log(`${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
