/**
 * Loads public pages on the LOCAL frontend as a first-time visitor (no consent
 * given, empty storage) and records every request to a host other than the
 * local app, plus cookies and storage keys set. Privacy check for pre-consent
 * tracking (ePrivacy Art. 5(3), GDPR Art. 7).
 *
 *   node note/2026-11-05-international-audit/scripts/third-party-capture.cjs
 */
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:3002';
const PAGES = ['/landing', '/login', '/register', '/marketplace', '/businesses', '/feed', '/nearby'];
const LOCAL = new Set(['127.0.0.1:3002', '127.0.0.1:3001', 'localhost:3002', 'localhost:3001']);

(async () => {
  const browser = await chromium.launch();
  const out = { ran_at: new Date().toISOString(), base: BASE, pages: [] };
  for (const path of PAGES) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const external = new Map();
    page.on('request', (req) => {
      const u = new URL(req.url());
      if (u.protocol.startsWith('http') && !LOCAL.has(u.host)) {
        const key = `${u.host} [${req.resourceType()}]`;
        external.set(key, (external.get(key) ?? 0) + 1);
      }
    });
    let status = null;
    try {
      const res = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 });
      status = res?.status() ?? null;
    } catch (err) { status = `error: ${err.message.split('\n')[0]}`; }
    await page.waitForTimeout(1500);
    const cookies = (await context.cookies()).map((c) => `${c.name} (${c.domain}, httpOnly=${c.httpOnly}, secure=${c.secure}, sameSite=${c.sameSite})`);
    const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })).catch(() => ({}));
    const banner = await page.locator('text=/cookie|consent/i').count().catch(() => 0);
    out.pages.push({ path, final_url: page.url().replace(BASE, ''), status, external_requests: Object.fromEntries(external), cookies, storage, consent_text_elements: banner });
    await context.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})();
