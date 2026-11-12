// Post-fix check for F-013 (LOCAL ONLY): node <this> <photo.png> <screenshot.png>. Needs `source ~/.nodbusiness-local/env.sh`.
const { chromium } = require('playwright');
const [photo, shot] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const calls = []; p.on('response', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/verification') || u.pathname.startsWith('/api/upload')) calls.push(`${r.request().method()} ${u.pathname} -> ${r.status()}`); });
  await p.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
  await p.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL); await p.getByLabel('Password', { exact: true }).fill(process.env.E2E_TEST_PASSWORD);
  await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/login')), p.getByRole('button', { name: 'Sign in', exact: true }).click()]);
  await p.goto('http://localhost:3002/profile/edit', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /^(Apply|Resubmit)$/ }).click();
  await p.locator('input[type="file"][capture="user"]').setInputFiles(photo);
  await p.getByRole('button', { name: 'Remove selfie' }).waitFor();
  await p.locator('input[type="file"][accept="image/*,application/pdf"]').setInputFiles(photo);
  await p.getByRole('button', { name: 'Remove ID' }).waitFor();
  const previewSrcs = await p.locator('img[alt="selfie"], img[alt="ID document"]').evaluateAll(els => els.map(e => e.getAttribute('src')));
  await p.getByRole('button', { name: 'Submit for Review' }).click();
  await p.waitForTimeout(2000);
  await p.screenshot({ path: shot, fullPage: false });
  console.log(JSON.stringify({ calls, preview_sources: previewSrcs.map(s => (s || '').slice(0, 30)) }, null, 2));
  await b.close();
})().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });
