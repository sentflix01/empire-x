// Wave 4 browser check (LOCAL ONLY). Needs the local stack; sign-in steps need `source ~/.nodbusiness-local/env.sh`; axe checks need AXE_PATH=<axe-core 4.10.3 axe.min.js>; screenshots go to OUT=<dir>.
const { chromium } = require('playwright');
async function walk(p, n) {
  const seq = [];
  for (let i = 0; i < n; i++) {
    await p.keyboard.press('Tab');
    seq.push(await p.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return { el: 'body' };
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      const name = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || el.id || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const indicator = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
      return { el: `${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''}`, name, visible_focus_indicator: indicator, on_screen: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight };
    }));
  }
  return seq;
}
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const path of ['/login', '/register', '/landing']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    out[path] = await walk(p, path === '/landing' ? 8 : 12);
    if (path === '/register') {
      const cb = p.getByRole('checkbox', { name: /agree to the/i });
      await cb.focus(); await p.keyboard.press('Space');
      out.register_terms_checkbox_keyboard = { checked_after_space: await cb.isChecked(), focused_is_checkbox: await cb.evaluate(el => el === document.activeElement) };
    }
    if (path === '/landing') {
      await p.goto('http://localhost:3002/landing', { waitUntil: 'networkidle' });
      await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
      out.skip_link = await p.evaluate(() => ({ hash: location.hash, focused: document.activeElement?.id || document.activeElement?.tagName, main_exists: !!document.getElementById('main-content') }));
    }
    await p.close();
  }
  console.log(JSON.stringify(out, null, 2)); await b.close();
})();
