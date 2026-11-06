// Wave 4 browser check (LOCAL ONLY). Needs the local stack; sign-in steps need `source ~/.nodbusiness-local/env.sh`; axe checks need AXE_PATH=<axe-core 4.10.3 axe.min.js>; screenshots go to OUT=<dir>.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:3002/landing', { waitUntil: 'networkidle' });
  const r = await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const sw = reg.installing || reg.waiting || reg.active;
    const final = await new Promise((resolve) => {
      if (!sw) return resolve('no worker');
      if (sw.state === 'activated') return resolve('activated');
      sw.addEventListener('statechange', () => { if (['activated', 'redundant'].includes(sw.state)) resolve(sw.state); });
      setTimeout(() => resolve('timeout:' + sw.state), 8000);
    });
    return { final_state: final, active_after: !!(await navigator.serviceWorker.getRegistration('/'))?.active, cache_names: await caches.keys() };
  });
  console.log(JSON.stringify(r)); await b.close();
})();
