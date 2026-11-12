// Post-fix check for F-040 (LOCAL ONLY): signs in, opens /bookmarks, logs every /api/saves request. Needs `source ~/.nodbusiness-local/env.sh`.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const log = []; p.on('console', m => { if (['error','warning'].includes(m.type())) log.push(m.text().slice(0, 200)); });
  const saves = []; p.on('request', r => { if (r.url().includes('/api/saves')) saves.push(`${(performance.now()/1000).toFixed(1)}s ${r.method()} ${r.url()}`); });
  await p.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
  await p.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL); await p.getByLabel('Password', { exact: true }).fill(process.env.E2E_TEST_PASSWORD);
  await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/login')), p.getByRole('button', { name: 'Sign in', exact: true }).click()]);
  console.log('after login url:', p.url(), 'saves so far:', saves.length);
  await p.goto('http://localhost:3002/bookmarks', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  console.log('bookmarks url:', p.url());
  console.log('heading/text:', (await p.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200));
  console.log('saves requests:', JSON.stringify(saves)); console.log('console:', JSON.stringify(log.slice(0, 5)));
  await p.screenshot({ path: `${process.env.OUT_DIR || '.'}/bookmarks-after-fix.png` });
  await b.close();
})();
