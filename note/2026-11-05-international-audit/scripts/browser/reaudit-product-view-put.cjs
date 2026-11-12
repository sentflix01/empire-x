const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
  await p.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL); await p.getByLabel('Password', { exact: true }).fill(process.env.E2E_TEST_PASSWORD);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login')), p.getByRole('button', { name: 'Sign in', exact: true }).click()]);
  p.on('response', async (r) => { if (r.url().includes('/api/products/11d27024') && r.status() >= 400) console.log(r.request().method(), r.status(), r.url().replace(/https?:\/\/[^/]+/, ''), (r.request().postData() || '').slice(0, 200), (await r.text()).slice(0, 200)); });
  await p.goto('http://localhost:3002/products/11d27024-b166-4479-a9f4-7f8b54accad7', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await b.close();
})();
