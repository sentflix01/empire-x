// Wave 3 browser check (LOCAL ONLY). Run from any folder with the preinstalled Playwright: node <this file> [args]. Requires the local stack and, for sign-in steps, `source ~/.nodbusiness-local/env.sh`.
const { chromium } = require('playwright');
const SP = process.argv[2], OUT = process.argv[3];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const uploads = []; p.on('response', r => { if (r.url().includes('/api/upload')) uploads.push(`${r.request().method()} ${new URL(r.url()).pathname} -> ${r.status()}`); });
  await p.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
  await p.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL);
  await p.getByLabel('Password', { exact: true }).fill(process.env.E2E_TEST_PASSWORD);
  await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 30000 }), p.getByRole('button', { name: 'Sign in', exact: true }).click()]);
  await p.goto('http://localhost:3002/products/create', { waitUntil: 'networkidle' });
  const input = p.locator('input[type="file"]').first();
  await input.setInputFiles([`${SP}/photo1.png`, `${SP}/photo2.png`]);
  await p.waitForTimeout(3000);
  const errorText = await p.locator('text=/Upload failed/i').first().textContent({ timeout: 2000 }).catch(() => null); const previews = await p.locator('img[src*="/uploads/"]').count();
  await p.screenshot({ path: OUT, fullPage: false });
  console.log(JSON.stringify({ upload_responses: uploads, visible_error: errorText, uploaded_previews: previews }, null, 2));
  await b.close();
})();
