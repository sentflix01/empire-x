// Re-audit 2026-11-11 (LOCAL ONLY): core screens at 375 / 768 / 1440 px in light
// and dark, signed in as the seed member. Saves screenshots and records console
// errors/warnings, page errors and failed requests per screen.
//
//   source ~/.nodbusiness-local/env.sh
//   OUT=<dir> SCREENS='["/feed", ...]' node reaudit-screens.cjs > console.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3002';
const OUT = process.env.OUT;
const SCREENS = JSON.parse(process.env.SCREENS);
const GUEST = new Set(['/landing', '/login']);
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  // Refresh tokens rotate on use, so each browser context signs in on its own.
  async function signIn(ctx) {
    const ap = await ctx.newPage();
    await ap.goto(BASE + '/login', { waitUntil: 'networkidle' });
    await ap.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL);
    await ap.getByLabel('Password', { exact: true }).fill(process.env.E2E_TEST_PASSWORD);
    await Promise.all([ap.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }), ap.getByRole('button', { name: 'Sign in', exact: true }).click()]);
    await ap.close();
  }

  const report = [];
  for (const scheme of ['light', 'dark']) {
    for (const width of [375, 768, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 812 : 900 }, colorScheme: scheme, hasTouch: width < 800 });
      await ctx.addInitScript((s) => { try { localStorage.setItem('theme', s); sessionStorage.setItem('nb_splash_seen', '1'); } catch {} }, scheme);
      // Guest screens first, then sign in for the rest.
      const ordered = [...SCREENS.filter((x) => GUEST.has(x)), ...SCREENS.filter((x) => !GUEST.has(x))];
      let signedIn = false;
      for (const screen of ordered) {
        if (!GUEST.has(screen) && !signedIn) { await signIn(ctx); signedIn = true; }
        const page = await ctx.newPage();
        const logs = [];
        page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
        page.on('pageerror', (e) => logs.push(`pageerror: ${e.message.slice(0, 200)}`));
        page.on('requestfailed', (r) => { if (r.failure()?.errorText !== 'net::ERR_ABORTED' && !/tile\.openstreetmap|githubusercontent|unpkg/.test(r.url())) logs.push(`failed: ${r.url().replace(BASE, '')} ${r.failure()?.errorText}`); });
        page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/')) logs.push(`http ${r.status()}: ${r.url().replace(/https?:\/\/[^/]+/, '')}`); });
        try { await page.goto(BASE + screen, { waitUntil: 'networkidle', timeout: 45000 }); } catch (e) { logs.push('goto: ' + e.message.split('\n')[0]); }
        await page.waitForTimeout(700);
        const signedOut = !GUEST.has(screen) && /^\/(login|landing)/.test(page.url().replace(BASE, ''));
        if (signedOut) logs.push('SIGNED OUT');
        const name = `${screen.replace(/[/?=]/g, '_').replace(/^_/, '') || 'root'}-${width}-${scheme}.png`;
        await page.screenshot({ path: path.join(OUT, name), fullPage: false });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        report.push({ screen, width, scheme, final: page.url().replace(BASE, ''), overflow_px: overflow, logs: [...new Set(logs)] });
        await page.close();
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify({ ran_at: new Date().toISOString(), report }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
