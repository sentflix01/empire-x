/**
 * A brand-new user's journey, measured (owner's audit request, 15 Nov 2026).
 * Phone first (390×844, touch), like an impatient first-time visitor.
 *
 * LOCAL stack: the full journey — landing → Start free → sign up → email code
 * (read from the dev backend log, as a user reads their inbox) → first screen
 * → onboarding → first post → log out → wrong password → log in → forgot
 * password → reset (the email link is simulated by setting a known token's
 * hash, exactly what clicking the link proves) → log in with the new password.
 * Plus edge cases: invalid email, short / mismatched password, duplicate email,
 * very long input, unicode and special characters, wrong code ×11.
 *
 * Every step records: time, clicks/keystrokes, what the user sees (text of
 * errors), whether the error is announced (role=alert / aria-live) and tied to
 * its field (aria-invalid / aria-describedby), console errors, failed requests.
 *
 * Usage (from frontend-next/, after `source ~/.nodbusiness-local/env.sh`):
 *   node ../note/2026-11-15-new-user-audit/new-user-journey.mjs <out-dir>
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const fe = createRequire(path.join(root, 'frontend-next/package.json'));
const be = createRequire(path.join(root, 'backend/package.json'));
const { chromium, devices } = fe('playwright');
const { Pool } = be('pg');
const WEB = process.env.SCAN_WEB || 'http://localhost:3002';
const API = process.env.SCAN_API || 'http://localhost:3001';
const OUT = process.argv[2] || '/tmp/new-user-journey';
const LOG = path.join(process.env.HOME, '.nodbusiness-local/backend.log');
fs.mkdirSync(OUT, { recursive: true });
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) throw new Error('Local DATABASE_URL required');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const tag = crypto.randomBytes(3).toString('hex');
const email = `new.user+${tag}@example.com`;
const password = 'Correct-Horse-42!';
const journey = [];
const findings = [];
let clicks = 0; let keys = 0;
const t0 = Date.now();
const step = (what, saw, extra = {}) => { journey.push({ at_s: ((Date.now() - t0) / 1000).toFixed(1), clicks, keys, what, saw: String(saw).slice(0, 400), ...extra }); };
const note = (area, issue, evidence) => findings.push({ area, issue, evidence: String(evidence).slice(0, 400) });

/** Latest dev OTP for an address, as printed by utils/mailer.ts. */
async function otpFor(addr, since) {
  for (let i = 0; i < 40; i++) {
    const text = fs.readFileSync(LOG, 'utf8').slice(since);
    // eslint-disable-next-line no-control-regex
    const m = [...text.replace(/\x1b\[[0-9;]*m/g, '').matchAll(new RegExp(`DEV OTP for ${addr.replace(/[.+]/g, '\\$&')}: (\\d{6})`, 'g'))].pop();
    if (m) return m[1];
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}
/** What an error looks like to everyone: its text, whether it is announced and tied to a field. */
async function errorState(page) {
  return page.evaluate(() => {
    const live = [...document.querySelectorAll('[role="alert"], [aria-live="assertive"], [aria-live="polite"]')].map((e) => e.textContent.trim()).filter(Boolean);
    const box = [...document.querySelectorAll('.text-destructive, [class*="destructive"]')].map((e) => e.textContent.trim()).filter((t) => t && t.length < 200);
    const invalid = [...document.querySelectorAll('[aria-invalid="true"]')].map((e) => e.id || e.getAttribute('name'));
    const native = [...document.querySelectorAll('input')].filter((i) => !i.checkValidity()).map((i) => `${i.id || i.name}: ${i.validationMessage}`);
    return { announced: live, shown: [...new Set(box)], invalidFields: invalid, nativeValidation: native };
  });
}

const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
const consoleErrors = []; const failed = [];
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = 'nextjs-portal{display:none!important}'; document.head.appendChild(st); }); });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${page.url().replace(WEB, '')}: ${m.text().slice(0, 200)}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon|_next\/static/.test(r.url())) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(WEB, '').replace(API, 'API')}`); });
  const tap = async (loc) => { await loc.click(); clicks++; };
  const type = async (loc, text) => { await loc.fill(text); keys += text.length; };
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${String(journey.length).padStart(2, '0')}-${n}.png`) });

  // ── First visit ──────────────────────────────────────────────────────────
  await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
  const first = await page.evaluate(() => ({
    url: location.pathname, title: document.title,
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().replace(/\s+/g, ' ')),
    ctas: [...document.querySelectorAll('a,button')].filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.width > 40 && r.height > 30; }).map((e) => (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 12),
  }));
  step('Open the app on a phone', `lands on ${first.url}; h1: ${first.h1.join(' | ')}; visible actions: ${first.ctas.join(' · ')}`);
  await shot('first-screen');
  const startFree = page.getByRole('link', { name: /Start free|Create account|Sign up|Get started/i }).first();
  await tap(startFree);
  await page.waitForURL(/register/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  const reg = await page.evaluate(() => ({
    fields: [...document.querySelectorAll('input:not([type=hidden])')].filter((i) => i.offsetParent).map((i) => `${i.type}#${i.id || i.name}${i.required ? '*' : ''}`),
    focused: document.activeElement?.id || document.activeElement?.tagName,
    google: Boolean(document.querySelector('[aria-label="Sign up with Google"] iframe, [aria-label="Sign up with Google"] div[role=button]')),
    googleText: document.querySelector('[aria-label="Sign up with Google"]')?.textContent?.trim() || '',
    passwordHint: [...document.querySelectorAll('p,span,small')].map((e) => e.textContent.trim()).find((t) => /8 characters|password must|characters/i.test(t)) || '',
  }));
  step('Tap the main sign-up button', `register form fields: ${reg.fields.join(', ')}; focused: ${reg.focused}; Google button rendered: ${reg.google} ${reg.googleText}; password rule shown: "${reg.passwordHint}"`);
  await shot('register');

  // ── Edge cases on the form ───────────────────────────────────────────────
  const emailIn = page.locator('#email'); const pwIn = page.locator('#password'); const cfIn = page.locator('#confirm');
  // Users tap the drawn 16 px box (the real checkbox is visually hidden).
  const termsBox = page.locator('[data-page-guide="register-terms"] > div').first();
  const terms = { isChecked: () => page.getByRole('checkbox').first().isChecked(), click: () => termsBox.click() };
  const tb = await termsBox.boundingBox();
  step('Terms checkbox size on a phone', `${Math.round(tb?.width ?? 0)}×${Math.round(tb?.height ?? 0)} px drawn box (label text also toggles it, but its two links open new tabs)`);
  const submit = page.getByRole('button', { name: /Create account|Sign up|Continue/i }).last();
  await type(emailIn, 'selam@gmial'); await type(pwIn, 'short'); await type(cfIn, 'short');
  if (await submit.isDisabled()) {
    const why = await page.evaluate(() => { const b = [...document.querySelectorAll('button[type=submit]')].pop(); return b?.getAttribute('aria-describedby') || b?.title || ''; });
    step('Tap "Create account" with every field filled', `nothing happens: the button is disabled (grey) until the terms box is ticked; reason shown: "${why}"`);
    note('Signup', 'Create account is disabled until the terms box is ticked, and nothing says why', 'disabled={!agreed || ...} in views/Register.tsx; no hint near the button');
    await tap(terms);
  }
  await tap(submit);
  let es = await errorState(page);
  step('Submit with a typo email and a 5-character password', JSON.stringify(es));
  await shot('invalid-submit');
  await type(emailIn, email); await type(pwIn, 'short'); await type(cfIn, 'short');
  if (!(await terms.isChecked())) await tap(terms);
  await tap(submit); await page.waitForTimeout(800);
  es = await errorState(page);
  step('Valid email, short password', JSON.stringify(es));
  await type(pwIn, password); await type(cfIn, password + 'x');
  await tap(submit); await page.waitForTimeout(500);
  es = await errorState(page);
  step('Passwords do not match', JSON.stringify(es));
  if (!es.announced.length) note('Accessibility', 'Sign-up errors are not announced to screen readers', JSON.stringify(es));
  if (!es.invalidFields.length) note('Accessibility', 'Sign-up errors are not tied to the field (no aria-invalid / aria-describedby)', JSON.stringify(es));
  // Very long and unicode input.
  await type(emailIn, `${'a'.repeat(300)}@example.com`); await type(pwIn, password); await type(cfIn, password);
  await tap(submit); await page.waitForTimeout(800);
  es = await errorState(page);
  step('300-character email', JSON.stringify(es));

  // ── Create the account ───────────────────────────────────────────────────
  const tSign = Date.now();
  await type(emailIn, `  ${email.toUpperCase()}  `); await type(pwIn, password); await type(cfIn, password);
  const logSize = fs.statSync(LOG).size;
  await tap(submit);
  await page.getByLabel('Verification code').waitFor({ timeout: 20000 });
  step('Create account with a valid email (typed in capitals with spaces)', `code screen after ${Date.now() - tSign} ms: ${await page.locator('body').innerText().then((t) => t.split('\n').filter((l) => /code|sent|email/i.test(l)).slice(0, 3).join(' / '))}`);
  await shot('otp');
  const otp = await otpFor(email, logSize);
  if (!otp) throw new Error('No OTP in the dev log');
  // Wrong code first.
  await page.getByLabel('Verification code').fill('000000'); keys += 6;
  const verify = page.getByRole('button', { name: /Verify|Confirm|Continue/i }).first();
  await tap(verify); await page.waitForTimeout(800);
  step('Enter a wrong code', JSON.stringify(await errorState(page)));
  // As a person does: tap the boxes, delete the old digits, type the new ones.
  const kept = await page.getByLabel('Verification code').inputValue();
  step('After a wrong code', `the boxes still hold "${kept}" — the user must delete them first`);
  await page.getByLabel('Verification code').click(); clicks++;
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Backspace'); keys++; }
  await page.keyboard.type(otp, { delay: 60 }); keys += 6;
  await page.waitForTimeout(300);
  const tVerify = Date.now();
  if (await verify.isEnabled()) await tap(verify);
  await page.waitForURL((u) => !/register/.test(u.pathname), { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  step('Enter the code from the email', `→ ${new URL(page.url()).pathname} after ${Date.now() - tVerify} ms`);
  await shot('first-screen-signed-in');
  const signedUpAt = Date.now();
  const firstScreen = await page.evaluate(() => ({ h: [...document.querySelectorAll('h1,h2')].slice(0, 4).map((e) => e.textContent.trim().replace(/\s+/g, ' ')), dialogs: [...document.querySelectorAll('[role=dialog]')].map((d) => (d.getAttribute('aria-label') || d.textContent).trim().slice(0, 80)) }));
  step('First screen after sign-up', JSON.stringify(firstScreen), { time_to_account_s: ((signedUpAt - t0) / 1000).toFixed(1) });

  // The app may move a new user to /onboarding a moment after the feed shows.
  await page.waitForTimeout(3000);
  if (/onboarding/.test(page.url())) {
    step('A moment later the app jumps from the feed to onboarding', `→ ${new URL(page.url()).pathname} (anything typed in the feed is lost)`);
    await shot('onboarding');
    const ob = await page.evaluate(() => [...document.querySelectorAll('label')].map((l) => l.textContent.trim()).filter(Boolean));
    step('Onboarding asks for', ob.join(', '));
    await type(page.locator('#onboarding-display_name'), 'Selam Bekele');
    await tap(page.locator('[data-page-guide="onboard-continue"]'));
    await page.waitForURL(/feed/, { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    step('Fill Full Name only and continue', `→ ${new URL(page.url()).pathname}`);
  }
  // ── First success: share a first post ───────────────────────────────────
  let posted = false;
  try {
    const box = page.getByPlaceholder(/What.?s happening/i).first();
    const above = await box.evaluate((el) => Math.round(el.getBoundingClientRect().top));
    step('Find where to write a post', `"What's happening?" box starts ${above}px from the top (screen is ${page.viewportSize().height}px)`);
    await box.scrollIntoViewIfNeeded();
    await tap(box);
    await type(box, `Hello Nodbusiness, first post ${tag}`);
    await tap(page.getByRole('button', { name: 'Post', exact: true }).first());
    await page.waitForTimeout(1500);
    posted = (await pool.query("SELECT 1 FROM posts WHERE content LIKE $1", [`%first post ${tag}%`])).rowCount > 0;
    if (!posted) note('Core', 'First post did not save', 'no row in posts');
  } catch (err) { note('Core', 'Could not complete "write a first post"', err.message.split('\n')[0]); }
  step('Share a first post', posted ? `visible in the feed ${((Date.now() - signedUpAt) / 1000).toFixed(1)} s after sign-up` : 'not completed', { time_to_first_value_s: posted ? ((Date.now() - t0) / 1000).toFixed(1) : null });
  await shot('first-post');

  // ── Session ──────────────────────────────────────────────────────────────
  const cookies = await ctx.cookies();
  step('Session cookies set', cookies.map((c) => `${c.name} httpOnly=${c.httpOnly} secure=${c.secure} sameSite=${c.sameSite}`).join('; '));
  const tokenInStorage = await page.evaluate(() => Object.keys(localStorage).filter((k) => /token|auth|jwt/i.test(k)));
  if (tokenInStorage.length) step('Tokens in localStorage', tokenInStorage.join(', '));

  // Log out from the UI.
  let loggedOut = false;
  for (const name of [/Log ?out|Sign ?out/i]) {
    const direct = page.getByRole('button', { name }).first();
    if (await direct.count() && await direct.isVisible()) { await tap(direct); loggedOut = true; break; }
    const menu = page.getByRole('button', { name: /^More$|menu|account|open sidebar/i }).or(page.getByRole('link', { name: /^More$/ })).first();
    if (await menu.count()) { await tap(menu); await page.waitForTimeout(400); const item = page.getByRole('button', { name }).or(page.getByRole('menuitem', { name })).or(page.getByRole('link', { name })).first(); if (await item.count()) { await tap(item); loggedOut = true; } }
  }
  await page.waitForTimeout(1200);
  step('Log out', loggedOut ? `→ ${new URL(page.url()).pathname}` : 'could not find Log out on a phone');
  if (!loggedOut) note('Navigation', 'Log out not reachable on a phone within one menu', page.url());

  // Wrong password, then right.
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await type(page.locator('#email'), email); await type(page.locator('#password'), 'Wrong-password-1');
  await tap(page.getByRole('button', { name: 'Sign in', exact: true }));
  await page.waitForTimeout(1000);
  step('Log in with a wrong password', JSON.stringify(await errorState(page)));
  await type(page.locator('#password'), password);
  await tap(page.getByRole('button', { name: 'Sign in', exact: true }));
  await page.waitForURL((u) => !/login/.test(u.pathname), { timeout: 20000 });
  step('Log in with the right password', `→ ${new URL(page.url()).pathname}`);

  // Forgot / reset password.
  const ctx2 = await browser.newContext({ ...devices['iPhone 13'] });
  const p2 = await ctx2.newPage();
  await p2.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await p2.getByRole('link', { name: /Forgot password/ }).click();
  await p2.locator('#email').fill(email);
  await p2.getByRole('button', { name: /Send|Reset|Continue/i }).first().click();
  await p2.waitForTimeout(1200);
  step('Forgot password → send link', (await p2.locator('main, body').first().innerText()).split('\n').filter((l) => /email|link|sent|check/i.test(l)).slice(0, 2).join(' / '));
  const token = crypto.randomUUID();
  await pool.query("UPDATE users SET reset_token=$1, reset_expires=NOW()+INTERVAL '1 hour' WHERE email=$2", [crypto.createHash('sha256').update(token).digest('hex'), email]);
  await p2.goto(`${WEB}/reset-password?token=${token}`, { waitUntil: 'networkidle' });
  await p2.locator('#password').fill('New-Horse-43!'); await p2.locator('#confirm').fill('New-Horse-43!');
  await p2.getByRole('button', { name: /Reset|Save|Update|Set/i }).first().click();
  await p2.waitForTimeout(1500);
  step('Open the reset link and set a new password', `→ ${new URL(p2.url()).pathname}; ${(await p2.locator('body').innerText()).split('\n').filter((l) => /password|signed|success|updated/i.test(l)).slice(0, 2).join(' / ')}`);
  await p2.screenshot({ path: path.join(OUT, `${String(journey.length).padStart(2, '0')}-reset-done.png`) });
  // Old session after a password reset.
  const me = await page.evaluate(async (api) => (await fetch(`${api}/api/auth/me`, { credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` } })).status, API).catch(() => 'n/a');
  step('The other phone\'s session after the password reset', `GET /api/auth/me → ${me}`);
  await ctx2.close();

  // Duplicate email.
  const ctx3 = await browser.newContext({ ...devices['iPhone 13'] });
  const p3 = await ctx3.newPage();
  await p3.goto(`${WEB}/register`, { waitUntil: 'networkidle' });
  await p3.locator('#email').fill(email); await p3.locator('#password').fill(password); await p3.locator('#confirm').fill(password);
  await p3.locator('[data-page-guide="register-terms"] > div').first().click();
  await p3.getByRole('button', { name: /Create account|Sign up|Continue/i }).last().click();
  await p3.waitForTimeout(1000);
  step('Sign up again with the same email', JSON.stringify(await errorState(p3)));
  await ctx3.close();
  await ctx.close();
} catch (err) {
  note('Run', 'journey stopped', err.message.split('\n').slice(0, 8).join(' '));
} finally {
  // API-level limits (no browser): wrong code ×11 and login ×21 from one address.
  const j = async (p, body) => { const r = await fetch(`${API}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Account-Mode': 'real' }, body: JSON.stringify(body) }); return r.status; };
  const e2 = `limit+${tag}@example.com`;
  await j('/api/auth/register', { email: e2, password });
  const otpCodes = []; for (let i = 0; i < 11; i++) otpCodes.push(await j('/api/auth/verify-otp', { email: e2, otpCode: String(100000 + i) }));
  step('Wrong email code 11 times (API)', otpCodes.join(','));
  const logins = []; for (let i = 0; i < 22; i++) logins.push(await j('/api/auth/login', { email: e2, password: 'nope-nope-1' }));
  step('Wrong login 22 times from one address (API)', logins.join(','));
  await browser.close();
  await pool.query('DELETE FROM users WHERE email IN ($1,$2)', [email, e2]).catch(() => {});
  await pool.end();
}
fs.writeFileSync(path.join(OUT, 'journey.json'), JSON.stringify({ journey, findings, consoleErrors, failed }, null, 2));
for (const s of journey) console.log(`[${s.at_s}s c${s.clicks} k${s.keys}] ${s.what}\n    ${s.saw}${s.time_to_account_s ? `  (account at ${s.time_to_account_s}s)` : ''}${s.time_to_first_value_s ? `  (first value at ${s.time_to_first_value_s}s)` : ''}`);
console.log('\nFINDINGS'); for (const f of findings) console.log(`- [${f.area}] ${f.issue} — ${f.evidence}`);
console.log('\nCONSOLE ERRORS', consoleErrors.length); for (const c of [...new Set(consoleErrors)].slice(0, 10)) console.log('  ', c);
console.log('FAILED REQUESTS', failed.length); for (const c of [...new Set(failed)].slice(0, 15)) console.log('  ', c);
