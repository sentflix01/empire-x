// Wave 4 browser check (LOCAL ONLY). Needs the local stack; sign-in steps need `source ~/.nodbusiness-local/env.sh`; axe checks need AXE_PATH=<axe-core 4.10.3 axe.min.js>; screenshots go to OUT=<dir>.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const out = [];
  for (const path of ['/landing', '/login', '/register', '/forgot-password', '/marketplace', '/feed', '/businesses', '/service-agreement', '/showroom/e2e-coffee-house']) {
    await p.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' });
    out.push(await p.evaluate((path) => ({ path, skip_link: !!document.querySelector('a[href="#main-content"]'), target_exists: !!document.getElementById('main-content'), main_landmarks: document.querySelectorAll('main,[role=main]').length, h1_count: document.querySelectorAll('h1').length }), path));
  }
  console.log(JSON.stringify(out)); await b.close();
})();
