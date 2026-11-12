// Post-fix verification against PRODUCTION (read-only: GET/HEAD only, as a
// guest, no sign-in, no form submissions). Maps each check to an audit finding.
//
//   AXE_PATH=<axe-core 4.10.3 axe.min.js> node prod-verify.cjs > ../evidence/prod-verify-<date>.json
//
// Optional: FRONTEND (default https://nodbusiness.vercel.app),
//           BACKEND  (default https://nodbusiness-backend-9psf.onrender.com).
const fs = require('fs');
const { chromium } = require('playwright');

const FE = process.env.FRONTEND || 'https://nodbusiness.vercel.app';
const BE = process.env.BACKEND || 'https://nodbusiness-backend-9psf.onrender.com';
const AXE = process.env.AXE_PATH ? fs.readFileSync(process.env.AXE_PATH, 'utf8') : null;
const results = [];
// Pages wait for 'load' plus a pause, not network idle: third-party images
// (storage hosts) may be slow or blocked where this runs.
const settle = (p) => p.waitForTimeout(1500);
const check = (finding, name, pass, detail) => results.push({ finding, check: name, pass: Boolean(pass), detail });

async function get(url, opts = {}) {
  const t0 = Date.now();
  const res = await fetch(url, { method: 'GET', redirect: 'manual', ...opts });
  const ms = Date.now() - t0;
  let body = null;
  const type = res.headers.get('content-type') || '';
  if (type.includes('json')) body = await res.json().catch(() => null);
  else if (opts.text) body = await res.text();
  return { status: res.status, headers: res.headers, body, ms };
}

(async () => {
  // ── API (backend) ─────────────────────────────────────────────────────────
  const health = await get(`${BE}/health`);
  check('F-030', 'API /health answers 200', health.status === 200, `${health.status} in ${health.ms} ms; services ${JSON.stringify(health.body?.services ?? {})}`);
  const warm = await get(`${BE}/health`);
  check('F-030', 'API answers a second request within 2 s', warm.status === 200 && warm.ms < 2000, `${warm.ms} ms`);

  const me = await get(`${BE}/api/auth/me`);
  check('F-007', 'Unauthenticated request: 401 with code and request_id', me.status === 401 && me.body?.code === 'UNAUTHORIZED' && typeof me.body?.request_id === 'string', JSON.stringify(me.body));

  const bad = await get(`${BE}/api/products/not-a-uuid`);
  check('F-034', 'Malformed product id: 404, not 500', bad.status === 404, `${bad.status}`);

  for (const [finding, path] of [['F-023', '/api/devops/versions'], ['F-006', '/api/devops/errors/stats'], ['F-005', '/api/telegram/status']]) {
    const r = await get(`${BE}${path}`);
    check(finding, `${path} requires sign-in (route exists)`, r.status === 401, `${r.status} ${r.body?.code ?? ''}`);
  }
  const chapa = await get(`${BE}/api/orders/chapa/status/tx-nonexistent`);
  check('F-019', 'Chapa status needs sign-in', chapa.status === 401 || chapa.status === 404, `${chapa.status}`);

  // ── Frontend (headers and routing) ───────────────────────────────────────
  const landing = await get(`${FE}/landing`, { text: true });
  const csp = landing.headers.get('content-security-policy') || '';
  check('F-016', 'Page CSP uses a nonce and strict-dynamic', /'nonce-[^']+'/.test(csp) && csp.includes("'strict-dynamic'") && !/script-src[^;]*'unsafe-inline'/.test(csp), csp.slice(0, 160));
  check('F-052', 'CSP no longer allows Stripe hosts', !csp.includes('stripe.com'), csp.includes('stripe.com') ? 'stripe.com present' : 'absent');
  check('F-016', 'No X-Powered-By header', !landing.headers.get('x-powered-by'), landing.headers.get('x-powered-by') || 'absent');
  const html = landing.body || '';
  check('F-047', 'Landing no longer promotes a wallet or "payments"', !/Secure wallet|12,480 ETB|commerce, payments/.test(html), 'checked server HTML');

  const unknown = await get(`${FE}/this-page-does-not-exist`);
  check('F-036', 'Unknown page: 404 (no sign-in redirect)', unknown.status === 404, `${unknown.status} ${unknown.headers.get('location') || ''}`);
  for (const path of ['/orders', '/products/create']) {
    const r = await get(`${FE}${path}`);
    const loc = r.headers.get('location') || '';
    check(path === '/orders' ? 'F-036' : 'F-012', `${path} sends guests to sign-in`, [307, 308].includes(r.status) && loc.includes('/login'), `${r.status} → ${loc}`);
  }
  const og = await get(`${FE}/opengraph-image`);
  check('F-036', 'Share image is served to guests/crawlers', og.status === 200 && (og.headers.get('content-type') || '').startsWith('image/'), `${og.status} ${og.headers.get('content-type')}`);
  const sw = await get(`${FE}/sw.js`, { text: true });
  // v3 or later: pages and API responses are never cached (later versions only change logo handling).
  const swVersion = Number(/const VERSION = 'v(\d+)'/.exec(sw.body || '')?.[1] ?? 0);
  check('F-048', 'Service worker v3 or later is published', sw.status === 200 && swVersion >= 3, `${sw.status}, v${swVersion}`);
  const offline = await get(`${FE}/offline`);
  check('F-048', 'Offline page is public', offline.status === 200, `${offline.status}`);

  // ── Browser (client-rendered content and accessibility) ──────────────────
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${FE}/service-agreement?tab=accessibility`, { waitUntil: 'load', timeout: 45000 }); await settle(page);
  check('F-055', 'Legal page has the Accessibility statement', await page.getByRole('heading', { level: 2, name: 'Accessibility' }).isVisible().catch(() => false), 'tab=accessibility');

  await page.goto(`${FE}/register`, { waitUntil: 'load', timeout: 45000 }); await settle(page);
  const toggle = await page.getByRole('button', { name: 'Show password' }).first().boundingBox().catch(() => null);
  check('F-044', 'Show-password target at least 24 × 24 px', toggle && toggle.width >= 24 && toggle.height >= 24, JSON.stringify(toggle));

  await page.goto(`${FE}/feed`, { waitUntil: 'load', timeout: 45000 }); await settle(page);
  const tokens = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand-secondary').trim());
  check('F-046', 'Colour-system tokens are live', tokens.length > 0, `--brand-secondary: ${tokens}`);

  const narrow = await browser.newPage({ viewport: { width: 320, height: 700 } });
  for (const path of ['/feed', '/marketplace']) {
    await narrow.goto(`${FE}${path}`, { waitUntil: 'load', timeout: 45000 }); await settle(narrow);
    const w = await narrow.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    check('F-044', `${path}: no sideways scroll at 320 px`, w[0] <= w[1], `${w[0]} / ${w[1]}`);
  }

  if (AXE) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
      await ctx.addInitScript((s) => { try { localStorage.setItem('theme', s); } catch { /* ignore */ } }, scheme);
      const p = await ctx.newPage();
      for (const path of ['/landing', '/login', '/register', '/feed', '/marketplace', '/businesses', '/showrooms', '/service-agreement']) {
        await p.goto(`${FE}${path}`, { waitUntil: 'load', timeout: 45000 }); await p.waitForTimeout(600);
        await p.addScriptTag({ content: AXE });
        const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map((x) => `${x.id}(${x.nodes.length})`));
        check('F-041/F-043', `axe WCAG 2.2 AA, ${scheme}, ${path}`, v.length === 0, v.join(', ') || 'no violations');
      }
      await ctx.close();
    }
  }
  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  console.log(JSON.stringify({ ran_at: new Date().toISOString(), frontend: FE, backend: BE, passed, total: results.length, results }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
