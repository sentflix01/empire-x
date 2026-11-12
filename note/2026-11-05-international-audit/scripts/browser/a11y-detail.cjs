// Wave 4 browser check (LOCAL ONLY). Needs the local stack; sign-in steps need `source ~/.nodbusiness-local/env.sh`; axe checks need AXE_PATH=<axe-core 4.10.3 axe.min.js>; screenshots go to OUT=<dir>.
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(process.env.AXE_PATH, 'utf8');
(async () => {
  const b = await chromium.launch(); const out = {};
  // 1) Contrast pairs and prohibited-ARIA elements on guest pages
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const pairs = {}; const prohibited = new Set();
  for (const path of ['/login', '/marketplace', '/feed', '/businesses', '/explore']) {
    await p.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    await p.addScriptTag({ content: AXE });
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['color-contrast', 'aria-prohibited-attr'] })).violations);
    for (const v of r) for (const n of v.nodes) {
      if (v.id === 'color-contrast') { const d = n.any[0]?.data || {}; const k = `${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}:1 (need ${d.expectedContrastRatio}) ${d.fontSize}`; pairs[k] = (pairs[k] || 0) + 1; }
      else prohibited.add(n.html.slice(0, 180));
    }
  }
  out.contrast_pairs = Object.entries(pairs).sort((a, c) => c[1] - a[1]).slice(0, 12);
  out.aria_prohibited_html = [...prohibited].slice(0, 6);
  // 2) What overflows at 320 px
  const s = await b.newPage({ viewport: { width: 320, height: 640 } });
  await s.goto('http://localhost:3002/feed', { waitUntil: 'networkidle' }); await s.waitForTimeout(600);
  out.overflow_320 = await s.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && getComputedStyle(el).position !== 'fixed').map(el => ({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 90), right: Math.round(el.getBoundingClientRect().right), width: Math.round(el.getBoundingClientRect().width) })).sort((a, c) => c.width - a.width).slice(0, 5));
  console.log(JSON.stringify(out, null, 2)); await b.close();
})();
