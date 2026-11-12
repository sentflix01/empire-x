// Wave 4 browser check (LOCAL ONLY). Needs the local stack; sign-in steps need `source ~/.nodbusiness-local/env.sh`; axe checks need AXE_PATH=<axe-core 4.10.3 axe.min.js>; screenshots go to OUT=<dir>.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
  await p.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL); await p.getByLabel('Password', { exact: true }).fill(process.env.E2E_TEST_PASSWORD);
  await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/login')), p.getByRole('button', { name: 'Sign in', exact: true }).click()]);
  const reqs = []; const pending = new Map();
  p.on('request', r => { const k = `${r.method()} ${new URL(r.url()).pathname}`; reqs.push(k); pending.set(r, k); });
  p.on('requestfinished', r => pending.delete(r)); p.on('requestfailed', r => pending.delete(r));
  await p.goto('http://localhost:3002/bookmarks', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(10000);
  const counts = reqs.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
  console.log(JSON.stringify({ total_requests_10s: reqs.length, by_path: Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)), still_pending: [...pending.values()] }, null, 2));
  await b.close();
})();
