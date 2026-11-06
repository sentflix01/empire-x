// Post-fix check for F-006 (LOCAL ONLY): signs in as the seeded admin, opens
// /admin/devops, visits each section, and lists every /api call that fails.
// Needs `source ~/.nodbusiness-local/env.sh` and the local stack.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const failed = []; const calls = new Set();
  p.on('response', (r) => {
    const u = new URL(r.url());
    if (!u.pathname.startsWith('/api/')) return;
    calls.add(`${r.request().method()} ${u.pathname}`);
    if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${u.pathname}`);
  });
  await p.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
  await p.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL || 'e2e-seller@nodbusiness.test');
  await p.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login')), p.getByRole('button', { name: 'Sign in', exact: true }).click()]);
  await p.goto('http://localhost:3002/admin/devops', { waitUntil: 'networkidle' });
  const tabs = await p.locator('button').allInnerTexts();
  for (const label of ['Live Errors', 'Errors', 'Strategy', 'Health', 'Changelog', 'Task Log', 'Summary']) {
    const t = p.getByRole('button', { name: label, exact: true }).first();
    if (await t.count()) { await t.click(); await p.waitForTimeout(1200); }
  }
  console.log('has Knowledge Base tab:', tabs.some((t) => /Knowledge Base/.test(t)));
  console.log('api calls:', JSON.stringify([...calls].sort()));
  console.log('failed:', JSON.stringify(failed));
  await p.screenshot({ path: `${process.env.OUT_DIR || '.'}/devops-console-after-fix.png` });
  await b.close();
})();
