// Wave 3 browser check (LOCAL ONLY). Run from any folder with the preinstalled Playwright: node <this file> [args]. Requires the local stack and, for sign-in steps, `source ~/.nodbusiness-local/env.sh`.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('http://localhost:3002/register', { waitUntil: 'networkidle' });
  const pw = 'Audit-' + Math.random().toString(36).slice(2) + '-Pw9';
  await p.getByLabel(/^email/i).fill(`otp-a11y-${Date.now()}@example.test`);
  const pwFields = p.locator('input[type="password"]'); await p.waitForLoadState('networkidle');
  for (let i = 0; i < await pwFields.count(); i++) await pwFields.nth(i).fill(pw);
  const name = p.getByLabel(/full name|name/i).first(); if (await name.isVisible().catch(() => false)) await name.fill('OTP Accessibility Check');
  await p.getByRole('checkbox', { name: /agree to the/i }).check({ force: true });
  await p.getByRole('button', { name: /create account|sign up|register/i }).first().click();
  await p.getByRole('heading', { name: /check your email/i }).waitFor({ timeout: 30000 });
  const snap = await p.locator('main, body').first().ariaSnapshot();
  const input = p.locator('input').filter({ hasNot: p.locator('[type=hidden]') }).first();
  const attrs = await input.evaluate(el => ({ type: el.type, name: el.name || null, id: el.id || null, ariaLabel: el.getAttribute('aria-label'), ariaLabelledby: el.getAttribute('aria-labelledby'), autocomplete: el.getAttribute('autocomplete'), inputmode: el.getAttribute('inputmode'), hasLabelElement: !!(el.labels && el.labels.length) }));
  console.log(`# OTP step accessibility evidence (local, ${new Date().toISOString()})\n\n## Code input attributes\n\n\`\`\`json\n${JSON.stringify(attrs, null, 2)}\n\`\`\`\n\n## Accessibility tree (Playwright ariaSnapshot)\n\n\`\`\`yaml\n${snap}\n\`\`\``);
  await b.close();
})().catch(e => { console.error(e.message.split('\n')[0]); process.exit(1); });
