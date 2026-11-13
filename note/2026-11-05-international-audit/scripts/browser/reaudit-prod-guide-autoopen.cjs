const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: [`--proxy-server=${process.env.HTTPS_PROXY}`, '--ignore-certificate-errors'] });
  for (const [label, opts] of [['desktop', { viewport: { width: 1350, height: 940 } }], ['phone', devices['Pixel 7']]]) {
    const ctx = await b.newContext({ ...opts, ignoreHTTPSErrors: true });
    const p = await ctx.newPage();
    await p.route(/\/api\//, (r) => r.request().method() === 'GET' ? r.continue() : r.abort());
    for (const path of ['/landing', '/marketplace', '/login']) {
      await p.goto('https://nodbusiness.vercel.app' + path, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(4000);
      const g = await p.evaluate(() => {
        const d = document.querySelector('#page-guide-description');
        const overlay = document.querySelector('.z-guide');
        return { description: d ? d.textContent.slice(0, 80) : null, overlay: !!overlay, visible: d ? !!(d.offsetWidth || d.offsetHeight) : false };
      });
      console.log(label, path, JSON.stringify(g));
      if (path === '/landing') await p.screenshot({ path: `guide-prod-${label}.png` });
    }
    await ctx.close();
  }
  await b.close();
})();
