// Wave 3 browser check (LOCAL ONLY). Run from any folder with the preinstalled Playwright: node <this file> [args]. Requires the local stack and, for sign-in steps, `source ~/.nodbusiness-local/env.sh`.
const { chromium } = require('playwright');
const [pid, email, shot] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const posts = []; p.on('request', r => { if (r.method() === 'POST' && r.url().includes('/api/direct-orders')) posts.push(new URL(r.url()).pathname); });
  await p.goto(`http://localhost:3002/products/${pid}`, { waitUntil: 'networkidle' });
  const buy = p.getByRole('button', { name: /buy/i }).first();
  await buy.click();
  for (let i = 0; i < 3 && !(await p.locator('#buyer-name').isVisible().catch(() => false)); i++) {
    const next = p.getByRole('dialog').getByRole('button', { name: /continue|next|checkout|pay the seller|enter details/i }).first();
    if (await next.isVisible().catch(() => false)) await next.click(); else break;
  }
  await p.fill('#buyer-name', 'Double Click Test'); await p.fill('#buyer-phone', '+251911000000'); await p.fill('#buyer-email', email);
  await p.getByRole('button', { name: /place order/i }).dblclick();
  await p.waitForTimeout(3000);
  await p.screenshot({ path: shot });
  console.log(JSON.stringify({ order_posts_sent: posts.length, posts }));
  await b.close();
})().catch(e => { console.log(JSON.stringify({ error: e.message.split('\n')[0] })); process.exit(1); });
