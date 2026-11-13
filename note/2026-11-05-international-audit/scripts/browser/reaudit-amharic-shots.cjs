const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('empire_lang', 'am'); sessionStorage.setItem('nb_splash_seen', '1'); } catch {} });
  const p = await ctx.newPage();
  for (const path of ['/landing', '/login']) { await p.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); await p.screenshot({ path: `reaudit/am${path.replace('/', '-')}.png` }); }
  await p.getByRole('textbox').first().fill(process.env.E2E_TEST_EMAIL); await p.locator('input[type=password]').fill(process.env.E2E_TEST_PASSWORD);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login')), p.locator('button[type=submit]').click()]);
  for (const path of ['/analytics', '/account', '/orders']) { await p.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(900); await p.screenshot({ path: `reaudit/am${path.replace('/', '-')}.png` }); }
  await b.close();
})();
