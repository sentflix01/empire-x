/**
 * Real-stack audit of the website builder (docs/audits/2026-11-showroom-builder-audit.md).
 *
 * Runs against the LOCAL stack only (local-stack.sh up: Postgres, backend :3001,
 * frontend :3002). It creates throw-away users, businesses, products and room
 * types, then:
 *
 *   A. Builds five sites modelled on real professional websites (shop,
 *      restaurant, hotel, salon, government office) from builder sections and
 *      checks every function on the public page as a visitor: sections render,
 *      order/book buttons open their dialogs, phone/email/WhatsApp links are
 *      valid, map and video embed, FAQ opens, the platform reviews block is
 *      present, no console errors. Screenshots at 375 and 1440 px.
 *   B. Drives the real Studio UI as a new owner: template -> edit name ->
 *      Publish -> owner actions (Unpublish, Publish again, Delete).
 *   C. Reviews: a buyer with a completed order rates a site from its page; the
 *      rating appears in the site header. A visitor without an order sees why
 *      they cannot review.
 *
 * Usage (from frontend-next/, after `source ~/.nodbusiness-local/env.sh`):
 *   node ../note/2026-11-14-showroom-audit/audit-run.mjs <screenshot-dir>
 * Prints a JSON summary; exits non-zero if any check fails.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const feRequire = createRequire(path.join(root, 'frontend-next/package.json'));
const beRequire = createRequire(path.join(root, 'backend/package.json'));
const { chromium } = feRequire('playwright');
const { Pool } = beRequire('pg');
const bcrypt = beRequire('bcryptjs');
const jwt = beRequire('jsonwebtoken');
const AXE = feRequire.resolve('axe-core/axe.min.js');
/** WCAG 2.2 AA scan; returns serious or critical violations. */
async function axe(page) {
  await page.addScriptTag({ path: AXE });
  const r = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }));
  return r.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(' ')}`);
}

const API = 'http://localhost:3001';
const WEB = 'http://localhost:3002';
const OUT = process.argv[2] || path.join(root, 'note/2026-11-14-showroom-audit/shots');
fs.mkdirSync(OUT, { recursive: true });
if (!process.env.DATABASE_URL || !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)) throw new Error('Local DATABASE_URL required (source ~/.nodbusiness-local/env.sh)');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const tag = crypto.randomBytes(3).toString('hex');
const PASSWORD = `Audit-${crypto.randomBytes(9).toString('hex')}`;
const results = [];
/** Waits up to `ms` for the locator to be visible (Playwright's isVisible() does not wait). */
const visible = (locator, ms = 10000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);
const check = (site, name, ok, detail = '') => { results.push({ site, check: name, ok: Boolean(ok), detail: String(detail).slice(0, 300) }); };

async function makeUser(label) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const { rows: [u] } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, provider, is_verified, is_demo, is_seed) VALUES ($1,$2,$3,'local',TRUE,FALSE,FALSE) RETURNING id, email`,
    [`audit-${label}-${tag}@example.test`, hash, `Audit ${label}`]);
  await pool.query(`INSERT INTO user_profiles (user_id, display_name) VALUES ($1,$2)`, [u.id, `Audit ${label}`]);
  return u;
}
async function makeBusiness(ownerId, name, category) {
  const { rows: [b] } = await pool.query(
    `INSERT INTO businesses (owner_id, business_name, business_category, visibility) VALUES ($1,$2,$3,'public') RETURNING id`, [ownerId, name, category]);
  await pool.query(`INSERT INTO business_subscriptions (business_id, tier, status, current_period_start, current_period_end) VALUES ($1,'pro','active',NOW(),NOW()+INTERVAL '30 days')`, [b.id]);
  return b.id;
}
async function makeProduct(ownerId, businessId, title, price) {
  const { rows: [p] } = await pool.query(
    `INSERT INTO products (seller_id, business_id, title, price, currency, stock, status, category) VALUES ($1,$2,$3,$4,'ETB',20,'active','general') RETURNING id`,
    [ownerId, businessId, title, price]);
  return p.id;
}
const token = (id) => jwt.sign({ sub: id, type: 'access', demo: false }, process.env.JWT_SECRET, { expiresIn: '30m', jwtid: crypto.randomUUID() });
async function api(user, method, url, body) {
  const res = await fetch(`${API}${url}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token(user.id)}` }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => ({ day, open: day !== 'Sunday', from: '08:00', to: '20:00' }));
const IMG = (n) => `https://picsum.photos/seed/nb-audit-${n}/800/600`;

/** Five sites, each modelled on a real professional website type (see the audit report). */
function siteSpecs(p) {
  return [
    { key: 'shop', ref: 'Allbirds / Bellroy (direct-to-consumer shop)', category: 'Business & Commerce', title: `Habesha Threads ${tag}`, sections: [
      { type: 'hero', title: `Habesha Threads ${tag}`, subtitle: 'Hand-woven clothing, made in Addis Ababa', cta: 'Shop now', heroBg: '#1d4ed8', heroBg2: '#7c3aed' },
      { type: 'items', itemsTitle: 'Best sellers', items: [
        { name: 'Cotton scarf', desc: 'Hand-woven, 180 cm', price: '850 ETB', product_id: p.shop[0] },
        { name: 'Linen shirt', desc: 'Breathable everyday shirt', price: '1,900 ETB', product_id: p.shop[1] }] },
      { type: 'features', featTitle: 'Why choose us', features: [{ name: 'Free returns', desc: '14 days' }, { name: 'Made locally', desc: 'Weavers in Addis' }] },
      { type: 'delivery', deliveryTitle: 'Delivery', deliveryZones: [{ zone: 'Addis Ababa', fee: '100 ETB', time: '1–2 days' }] },
      { type: 'faq', faqTitle: 'Questions', faqs: [{ question: 'Can I return an item?', answer: 'Yes, within 14 days if unworn.' }] },
      { type: 'contact', phone: '+251911000001', email: 'hello@example.test', whatsapp: '+251911000001', location: 'Bole, Addis Ababa' },
      { type: 'social', instagram: 'https://instagram.com/example', telegram: 'https://t.me/example' }] },
    { key: 'restaurant', ref: 'Sweetgreen / Tartine (restaurant and bakery)', category: 'Food & Beverage', title: `Selam Kitchen ${tag}`, sections: [
      { type: 'hero', title: `Selam Kitchen ${tag}`, subtitle: 'Fresh Ethiopian food, made to order', cta: 'See the menu', heroBg: '#b45309', heroBg2: '#7c2d12' },
      { type: 'menu', menuTitle: 'Menu', dishes: [
        { category: 'Mains', name: 'Doro wat', desc: 'Chicken stew, injera', price: '420 ETB', product_id: p.food[0] },
        { category: 'Drinks', name: 'Macchiato', desc: 'Single origin', price: '60 ETB', product_id: p.food[1] }] },
      { type: 'offer', offerTitle: 'Lunch special', offerDesc: 'Two mains for 700 ETB, weekdays', offerBtn: 'Order now' },
      { type: 'hours', hoursTitle: 'Opening hours', openingHours: week },
      { type: 'gallery', galleryTitle: 'Photos', galleryImages: [{ url: IMG(1), caption: 'Our kitchen' }, { url: IMG(2), caption: 'Doro wat' }] },
      { type: 'map', mapTitle: 'Find us', address: 'Bole Road, Addis Ababa' },
      { type: 'contact', phone: '+251911000002', whatsapp: '+251911000002', location: 'Bole Road, Addis Ababa' }] },
    { key: 'hotel', ref: 'Ace Hotel / Kuriftu Resort (hotel with booking)', category: 'Hospitality & Tourism', title: `Lake View Hotel ${tag}`, sections: [
      { type: 'hero', title: `Lake View Hotel ${tag}`, subtitle: 'Rooms by the lake in Bishoftu', cta: 'Book a room', heroBg: '#0e7490', heroBg2: '#1d4ed8' },
      { type: 'rooms', roomsTitle: 'Rooms', roomsDesc: 'Check availability and book your dates.' },
      { type: 'services', servTitle: 'Amenities', services: [{ name: 'Breakfast', desc: 'Included' }, { name: 'Airport shuttle', desc: 'On request' }] },
      { type: 'gallery', galleryTitle: 'Gallery', galleryImages: [{ url: IMG(3), caption: 'Lake view' }] },
      { type: 'video', vidTitle: 'Tour', vidUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', vidDesc: 'A short tour' },
      { type: 'faq', faqTitle: 'Before you book', faqs: [{ question: 'What time is check-in?', answer: 'From 14:00.' }] },
      { type: 'map', mapTitle: 'Location', address: 'Bishoftu, Ethiopia' },
      { type: 'contact', phone: '+251911000003', email: 'stay@example.test', location: 'Bishoftu' }] },
    { key: 'salon', ref: 'Drybar (salon with services, prices and booking)', category: 'Beauty & Personal Care', title: `Lula Hair Studio ${tag}`, sections: [
      { type: 'hero', title: `Lula Hair Studio ${tag}`, subtitle: 'Blowouts, braids and colour', cta: 'Book now', heroBg: '#be185d', heroBg2: '#7c3aed' },
      { type: 'services', servTitle: 'Services', services: [{ name: 'Blowout', desc: '45 minutes', price: '600 ETB', product_id: p.salon[0] }, { name: 'Braids', desc: '3 hours', price: '1,500 ETB', product_id: p.salon[1] }] },
      { type: 'pricing', pricingTitle: 'Packages', plans: [{ name: 'Bridal', price: '6,000 ETB', period: 'per event', features: 'Trial, styling, touch-ups' }] },
      { type: 'team', teamTitle: 'Our stylists', members: [{ name: 'Lula T.', role: 'Founder, stylist', bio: '12 years of experience' }] },
      { type: 'booking', bookingTitle: 'Book a visit', bookingDesc: 'Choose a time and we confirm by message.', bookingBtn: 'Request a booking' },
      { type: 'hours', hoursTitle: 'Hours', openingHours: week },
      { type: 'contact', phone: '+251911000004', whatsapp: '+251911000004', location: 'Kazanchis, Addis Ababa' }] },
    { key: 'government', ref: 'GOV.UK service page (government office)', category: 'Professional Services', title: `City Services Office ${tag}`, sections: [
      { type: 'hero', title: `City Services Office ${tag}`, subtitle: 'Apply for permits and certificates', cta: 'Start now', heroBg: '#1e3a8a', heroBg2: '#1d4ed8' },
      { type: 'services', servTitle: 'Services', services: [{ name: 'Business licence', desc: 'New and renewal' }, { name: 'Birth certificate', desc: 'Copies and corrections' }] },
      { type: 'process', processTitle: 'How to apply', processSteps: [{ title: 'Check you are eligible', desc: 'Read the requirements' }, { title: 'Prepare documents', desc: 'ID and proof of address' }, { title: 'Visit or apply', desc: 'Bring your documents' }] },
      { type: 'faq', faqTitle: 'Questions', faqs: [{ question: 'How long does it take?', answer: 'Usually 5 working days.' }] },
      { type: 'hours', hoursTitle: 'Office hours', openingHours: week },
      { type: 'map', mapTitle: 'Office location', address: 'Arada, Addis Ababa' },
      { type: 'contact', phone: '+251911000005', email: 'office@example.test', location: 'Arada, Addis Ababa' }] },
  ];
}

// One signed-in browser for the visitor: the backend rotates the refresh token
// on use and treats reuse of an old one as theft, so a saved login cannot be
// copied into several browsers.
async function checkPublicSite(visitorCtx, spec, slug) {
  for (const width of [375, 1440]) {
    const page = await visitorCtx.newPage();
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|picsum|ERR_|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    const res = await page.goto(`${WEB}/showroom/${slug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    if (width === 1440) {
      check(spec.key, 'page loads (200)', res?.status() === 200, res?.status());
      check(spec.key, 'h1 is the site name', (await page.locator('h1').first().textContent())?.includes(spec.title), await page.locator('h1').first().textContent());
      check(spec.key, 'platform reviews block present', await visible(page.getByTestId('site-reviews')));
      check(spec.key, 'no owner-written testimonials section', !(await page.getByText('What customers say').count()));
      const tel = await page.locator('a[href^="tel:"]').count();
      check(spec.key, 'phone link works (tel:)', tel > 0, `${tel} links`);
      const wa = await page.locator('a[href*="wa.me"]').first().getAttribute('href').catch(() => null);
      if (spec.sections.some((s) => s.whatsapp)) check(spec.key, 'WhatsApp link is wa.me with digits', /wa\.me\/\d{9,15}/.test(wa || ''), wa);
      if (spec.sections.some((s) => s.email)) check(spec.key, 'email link (mailto:)', (await page.locator('a[href^="mailto:"]').count()) > 0);
      if (spec.sections.some((s) => s.type === 'map')) check(spec.key, 'map embeds', (await page.locator('iframe[src*="google.com/maps"], iframe[title*="ap" i]').count()) > 0);
      if (spec.sections.some((s) => s.type === 'video')) check(spec.key, 'video embeds (YouTube)', (await page.locator('iframe[src*="youtube"]').count()) > 0);
      if (spec.sections.some((s) => s.type === 'faq')) {
        const q = spec.sections.find((s) => s.type === 'faq').faqs[0];
        const btn = page.getByText(q.question).first();
        await btn.click().catch(() => {});
        check(spec.key, 'FAQ answer shows', await visible(page.getByText(q.answer).first()));
      }
      if (spec.sections.some((s) => s.type === 'hours')) check(spec.key, 'opening hours shown', (await page.getByText(/Monday|Mon/).count()) > 0);
      const buyable = spec.sections.flatMap((s) => [...(s.items || []), ...(s.dishes || []), ...(s.services || [])]).filter((i) => i.product_id);
      if (buyable.length) {
        const buy = page.getByRole('button', { name: /^(Order|Buy Now)$/ }).first();
        const has = await buy.count();
        check(spec.key, 'order/book buttons on priced items', has > 0, `${has}`);
        if (has) {
          await buy.click();
          const dialog = page.getByRole('dialog').first();
          check(spec.key, 'order dialog opens', await visible(dialog, 5000));
          await page.keyboard.press('Escape');
        }
      }
      if (spec.key === 'hotel') {
        const avail = page.getByRole('button', { name: 'Check availability' }).first();
        check(spec.key, 'rooms listed with Check availability', (await avail.count()) > 0);
        if (await avail.count()) {
          await avail.click();
          check(spec.key, 'booking sheet opens with dates', await visible(page.getByLabel('Check-in'), 5000));
          await page.keyboard.press('Escape');
        }
      }
      if (spec.key === 'salon') check(spec.key, 'booking section call to action', (await page.getByText('Request a booking').count()) > 0);
      check(spec.key, 'no console or page errors', errors.length === 0, errors.join(' | '));
      const ax = await axe(page);
      check(spec.key, 'accessibility: no serious or critical WCAG 2.2 AA issues', ax.length === 0, ax.join(' | '));
    } else {
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(spec.key, 'no sideways scroll on a 375 px phone', sw <= 375, `scrollWidth ${sw}`);
    }
    await page.screenshot({ path: path.join(OUT, `${spec.key}-${width}.png`), fullPage: true });
    await page.close();
  }
}

async function login(browser, user, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(user.email);
  await page.getByLabel(/^password/i).first().fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
  return { ctx, page };
}

const cleanup = [];
try {
  // ── Accounts and data ────────────────────────────────────────────────
  const owner = await makeUser('owner'); cleanup.push(owner.id);
  const buyer = await makeUser('buyer'); cleanup.push(buyer.id);
  const studioOwner = await makeUser('studio'); cleanup.push(studioOwner.id);
  const biz = {};
  for (const [k, name, cat] of [['shop', 'Habesha Threads', 'shop'], ['restaurant', 'Selam Kitchen', 'food'], ['hotel', 'Lake View Hotel', 'hotel'], ['salon', 'Lula Hair Studio', 'beauty'], ['government', 'City Services Office', 'services']]) {
    biz[k] = await makeBusiness(owner.id, `${name} ${tag}`, cat);
  }
  const p = {
    shop: [await makeProduct(owner.id, biz.shop, 'Cotton scarf', 850), await makeProduct(owner.id, biz.shop, 'Linen shirt', 1900)],
    food: [await makeProduct(owner.id, biz.restaurant, 'Doro wat', 420), await makeProduct(owner.id, biz.restaurant, 'Macchiato', 60)],
    salon: [await makeProduct(owner.id, biz.salon, 'Blowout', 600), await makeProduct(owner.id, biz.salon, 'Braids', 1500)],
  };
  const room = await api(owner, 'POST', `/api/businesses/${biz.hotel}/rooms`, { name: 'Deluxe room', description: 'Lake view, king bed', price_per_night: 2500, max_guests: 2, units: 3 });
  check('hotel', 'room type created through the API', room.status === 201, room.status);
  await makeBusiness(studioOwner.id, `Studio Bakery ${tag}`, 'food');

  // ── A. Five sites from builder sections ──────────────────────────────
  const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
  const { ctx: buyerCtx, page: buyerHome } = await login(browser, buyer);
  await buyerHome.close();
  const slugs = {};
  for (const spec of siteSpecs(p)) {
    const created = await api(owner, 'POST', '/api/showrooms', { title: spec.title, category: spec.category, business_id: biz[spec.key], sections: JSON.stringify(spec.sections), status: 'published', theme_color: spec.sections[0].heroBg });
    check(spec.key, 'publishes through the API', created.status === 201 && created.body.status === 'published', `${created.status} ${created.body.error || ''} ${created.body.message || ''}`);
    if (created.status !== 201) continue;
    slugs[spec.key] = created.body.slug;
    await checkPublicSite(buyerCtx, spec, created.body.slug);
  }

  // ── C. Reviews on a live site ─────────────────────────────────────────
  {
    const page = await buyerCtx.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${WEB}/showroom/${slugs.restaurant}`, { waitUntil: 'networkidle' });
    check('reviews', 'visitor without an order sees why they cannot review', await visible(page.getByTestId('rate-business-reason'), 5000), await page.getByTestId('rate-business-reason').textContent().catch(() => ''));
    check('reviews', 'empty state before any review', await visible(page.getByTestId('site-reviews-empty')));
    await pool.query(
      `INSERT INTO orders (buyer_id, seller_id, business_id, product_title, quantity, unit_price, total_price, currency, status, payment_provider) VALUES ($1,$2,$3,'Doro wat',1,420,420,'ETB','completed','direct')`,
      [buyer.id, owner.id, biz.restaurant]);
    await page.reload({ waitUntil: 'networkidle' });
    const form = page.getByTestId('rate-business');
    check('reviews', 'verified customer sees the rating form on the site', await visible(form, 5000));
    if (await form.count()) {
      await page.getByRole('radio', { name: '5 stars' }).click();
      await page.getByLabel('Comment (optional)').fill('Great doro wat and very kind staff.');
      await page.getByRole('button', { name: 'Send review' }).click();
      check('reviews', 'review saved', await visible(page.getByTestId('rate-business-done'), 5000));
      check('reviews', 'review listed with Verified customer badge', await visible(page.getByText('Verified customer').first(), 5000));
      await page.reload({ waitUntil: 'networkidle' });
      check('reviews', 'rating summary in the site header', (await page.getByTestId('rating-summary').first().textContent({ timeout: 5000 }).catch(() => ''))?.includes('5.0'));
      await page.screenshot({ path: path.join(OUT, 'reviews-1280.png'), fullPage: true });
    }
    await page.close();
    const anon = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const ap = await anon.newPage();
    await ap.goto(`${WEB}/showroom/${slugs.restaurant}`, { waitUntil: 'networkidle' });
    const modal = ap.getByRole('dialog');
    if (await visible(modal, 5000)) {
      const demo = modal.getByRole('button', { name: /Try demo/i });
      const colors = await demo.evaluate((el) => { const s = getComputedStyle(el); return `${s.color} on ${s.backgroundColor}`; }).catch(() => 'missing');
      check('visitor', 'welcome modal Try Demo button is readable (not white on white)', !/rgb\(255, 255, 255\) on rgba?\(255, 255, 255|^rgb\(255, 255, 255\) on rgba\(255, 255, 255, 0\.1\)/.test(colors) && colors !== 'missing', colors);
      await ap.screenshot({ path: path.join(OUT, 'visitor-welcome-1280.png') });
      await ap.getByText('Continue as guest').click();
    }
    check('reviews', 'signed-out visitor is invited to sign in to review', await visible(ap.getByRole('link', { name: 'Sign in to leave a review' }), 5000));
    await anon.close();
  }

  // ── B. Real Studio flow ───────────────────────────────────────────────
  {
    const { ctx, page } = await login(browser, studioOwner);
    const q = new URLSearchParams({ step: '3', category: 'Food & Beverage', template: 'Bakery & Pastry' });
    await page.goto(`${WEB}/showroom/create?${q}`, { waitUntil: 'networkidle' });
    const name = page.getByLabel('Business name').first();
    check('studio', 'Studio opens on the template', await visible(name, 15000));
    { const ax = await axe(page); check('studio', 'accessibility: Studio has no serious or critical WCAG 2.2 AA issues', ax.length === 0, ax.join(' | ')); }
    await name.fill(`Studio Bakery ${tag}`);
    await page.getByRole('button', { name: 'Publish site' }).click();
    await page.waitForURL(/\/showrooms\/[0-9a-f-]{36}/, { timeout: 30000 }).catch(() => {});
    const id = page.url().match(/showrooms\/([0-9a-f-]{36})/)?.[1];
    check('studio', 'Publish goes to the live site', Boolean(id), page.url());
    if (id) {
      const { rows } = await pool.query('SELECT count(*)::int AS n FROM showrooms WHERE owner_id=$1', [studioOwner.id]);
      check('studio', 'exactly one website (no duplicate on publish)', rows[0].n === 1, rows[0].n);
      const row = (await pool.query('SELECT status, slug, theme_color, sections FROM showrooms WHERE id=$1', [id])).rows[0];
      check('studio', 'status published, readable address', row.status === 'published' && /^studio-bakery-/.test(row.slug), `${row.status} ${row.slug}`);
      check('studio', 'no testimonials in the template', !String(row.sections).includes('testimonials'));
      {
        const v = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const vp = await v.newPage();
        await vp.goto(`${WEB}/showroom/${(await pool.query('SELECT slug FROM showrooms WHERE id=$1', [id])).rows[0].slug}`, { waitUntil: 'networkidle' });
        const guest = vp.getByText('Continue as guest');
        if (await visible(guest, 5000)) await guest.click();
        await vp.waitForTimeout(800);
        const empty = await vp.evaluate(() => [...document.querySelectorAll('[id^="section-"]')]
          .filter((el) => el.id !== 'section-reviews' && el.getBoundingClientRect().height > 60 && (el.textContent || '').trim().length < 40)
          .map((el) => `${el.id}:"${(el.textContent || '').trim().slice(0, 30)}"`));
        check('studio', 'a template site with unfilled forms shows no empty sections to visitors', empty.length === 0, empty.join(', '));
        await vp.screenshot({ path: path.join(OUT, 'studio-visitor-view.png'), fullPage: true });
        await v.close();
      }
      const actionsVisible = await visible(page.getByTestId('owner-site-actions'), 15000);
      await page.screenshot({ path: path.join(OUT, 'studio-after-publish.png'), fullPage: true });
      check('studio', 'owner actions visible on the site', actionsVisible, page.url());
      check('studio', 'reviews block on the new site', await visible(page.getByTestId('site-reviews')));
      await page.getByRole('button', { name: 'Unpublish' }).click();
      await page.getByRole('button', { name: 'Publish again' }).waitFor({ timeout: 10000 }).catch(() => {});
      const anon = await browser.newContext();
      const ap = await anon.newPage();
      const off = await ap.goto(`${WEB}/showroom/${row.slug}`, { waitUntil: 'networkidle' });
      check('studio', 'unpublished site is not shown to visitors', (await ap.getByText(/not found|unavailable/i).count()) > 0, off?.status());
      await page.getByRole('button', { name: 'Publish again' }).click();
      await page.getByRole('button', { name: 'Unpublish' }).waitFor({ timeout: 10000 }).catch(() => {});
      await ap.goto(`${WEB}/showroom/${row.slug}`, { waitUntil: 'networkidle' });
      check('studio', 'published again: visitors see it, same address', await visible(ap.getByTestId('site-reviews'), 10000));
      await anon.close();
      // Edit keeps the address.
      await page.goto(`${WEB}/showroom/create?edit=${id}`, { waitUntil: 'networkidle' });
      await page.getByLabel('Business name').first().fill(`Studio Bakery Renamed ${tag}`);
      await page.getByRole('button', { name: 'Publish site' }).click();
      await page.waitForURL(new RegExp(`/showrooms/${id}`), { timeout: 30000 }).catch(() => {});
      const after = (await pool.query('SELECT slug, title FROM showrooms WHERE id=$1', [id])).rows[0];
      check('studio', 'editing keeps the address (QR codes keep working)', after.slug === row.slug && after.title.includes('Renamed'), `${after.slug} / ${after.title}`);
      await page.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('button', { name: 'Delete website' }).click();
      await page.waitForURL(/\/showrooms$/, { timeout: 15000 }).catch(() => {});
      const gone = (await pool.query('SELECT count(*)::int AS n FROM showrooms WHERE id=$1', [id])).rows[0].n;
      check('studio', 'Delete removes the site after confirmation', gone === 0, gone);
    }
    await ctx.close();
  }
  await browser.close();
} catch (err) {
  check('run', 'audit run finished without crashing', false, err?.stack || err);
} finally {
  for (const id of cleanup) {
    await pool.query('DELETE FROM orders WHERE buyer_id=$1 OR seller_id=$1', [id]).catch(() => {});
    await pool.query('DELETE FROM users WHERE id=$1', [id]).catch(() => {});
  }
  await pool.end();
}

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed }, null, 2));
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
