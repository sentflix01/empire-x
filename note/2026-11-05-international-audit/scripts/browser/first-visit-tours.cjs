// Wave 3 browser check (LOCAL ONLY). Run from any folder with the preinstalled Playwright: node <this file> [args]. Requires the local stack and, for sign-in steps, `source ~/.nodbusiness-local/env.sh`.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const path of ['/login', '/register', '/landing', '/marketplace']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
    const overlay = await p.locator('div[aria-label="Page guide"]').count();
    const text = overlay ? (await p.locator('div[aria-label="Page guide"]').innerText()).replace(/\s+/g, ' ').slice(0, 220) : '';
    const buttons = overlay ? await p.locator('div[aria-label="Page guide"] button').allInnerTexts() : [];
    await p.screenshot({ path: `' + (process.env.OUT_DIR || ".") + '/first-visit${path.replace(/\//g, '-')}.png` });
    console.log(JSON.stringify({ path, overlay, text, buttons }));
    await p.close();
  }
  await b.close();
})();
