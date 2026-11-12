// Wave 4 browser check (LOCAL ONLY). Needs the local stack; sign-in steps need `source ~/.nodbusiness-local/env.sh`; axe checks need AXE_PATH=<axe-core 4.10.3 axe.min.js>; screenshots go to OUT=<dir>.
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(process.env.AXE_PATH, 'utf8');
(async () => {
  const b = await chromium.launch(); const out = { dark: [], reduced_motion: [], forced_colors: [] };
  for (const path of ['/landing', '/login', '/marketplace', '/feed', '/businesses']) {
    const c = await b.newContext({ colorScheme: 'dark', viewport: { width: 1280, height: 900 } }); const p = await c.newPage();
    await p.addInitScript(() => { try { localStorage.setItem('theme', 'dark'); } catch {} });
    await p.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    const isDark = await p.evaluate(() => document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor);
    await p.addScriptTag({ content: AXE });
    const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['color-contrast'] })).violations[0]?.nodes.length ?? 0);
    await p.screenshot({ path: `${process.env.OUT}/dark${path.replace(/\//g, '-')}.png` });
    out.dark.push({ path, dark_applied: isDark, contrast_failures: v }); await c.close();
    const r = await b.newContext({ reducedMotion: 'reduce' }); const rp = await r.newPage();
    await rp.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' }); await rp.waitForTimeout(500);
    out.reduced_motion.push({ path, running_infinite_animations: await rp.evaluate(() => document.getAnimations().filter(a => { const t = a.effect?.getComputedTiming?.(); return a.playState === 'running' && t && t.iterations === Infinity; }).map(a => (a.animationName || a.constructor.name)).slice(0, 5)) }); await r.close();
    const f = await b.newContext({ forcedColors: 'active' }); const fp = await f.newPage();
    await fp.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' }); await fp.waitForTimeout(400);
    await fp.screenshot({ path: `${process.env.OUT}/forced-colors${path.replace(/\//g, '-')}.png` });
    out.forced_colors.push({ path, screenshot: `forced-colors${path.replace(/\//g, '-')}.png` }); await f.close();
  }
  console.log(JSON.stringify(out, null, 2)); await b.close();
})();
