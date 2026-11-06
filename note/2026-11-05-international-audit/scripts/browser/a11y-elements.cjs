// Fix-phase accessibility scan (LOCAL ONLY): the same pages and axe rules as
// a11y-scan.cjs, but records every failing element so fixes can be checked
// one by one (F-041 colour contrast, F-043 names and roles).
//
//   source ~/.nodbusiness-local/env.sh
//   AXE_PATH=<axe-core 4.10.3 axe.min.js> DYNAMIC='["/products/<id>","/profile/<id>"]' \
//     node a11y-elements.cjs > out.json
// Optional: THEME=dark (prefers-color-scheme), RULES=color-contrast,button-name
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.BASE || 'http://localhost:3002';
const AXE = fs.readFileSync(process.env.AXE_PATH, 'utf8');
const DYNAMIC = JSON.parse(process.env.DYNAMIC || '[]');
const RULES = process.env.RULES ? process.env.RULES.split(',') : null;
const GUEST = ['/landing', '/login', '/register', '/forgot-password', '/marketplace', '/businesses', '/showrooms', '/feed', '/explore', '/nearby', '/service-agreement', '/offline'];
const MEMBER = ['/feed', '/explore', '/marketplace', '/messages', '/notifications', '/orders', '/cart', '/settings', '/account', '/profile', '/profile/edit', '/products/create', '/business/create', '/business/subscription', '/showroom/create', '/search', '/friends', '/bookmarks'];

async function scan(page, path) {
  try { await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 }); } catch (e) { return { path, error: e.message.split('\n')[0] }; }
  await page.waitForTimeout(800);
  await page.addScriptTag({ content: AXE });
  const violations = await page.evaluate(async (rules) => {
    const opts = rules ? { runOnly: { type: 'rule', values: rules } } : { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } };
    const res = await window.axe.run(document, opts);
    return res.violations.flatMap((v) => v.nodes.map((n) => {
      const d = (n.any[0] && n.any[0].data) || {};
      return { rule: v.id, target: n.target.join(' '), html: n.html.slice(0, 220), ...(v.id === 'color-contrast' ? { fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, need: d.expectedContrastRatio } : {}) };
    }));
  }, RULES);
  return { path, url: page.url().replace(BASE, ''), violations };
}

(async () => {
  const browser = await chromium.launch();
  const colorScheme = process.env.THEME === 'dark' ? 'dark' : 'light';
  const results = [];
  const g = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme });
  const gp = await g.newPage();
  for (const path of [...GUEST, ...DYNAMIC]) results.push({ role: 'guest', ...(await scan(gp, path)) });
  await g.close();
  const m = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme });
  const mp = await m.newPage();
  await mp.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await mp.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL);
  await mp.getByLabel('Password', { exact: true }).fill(process.env.E2E_TEST_PASSWORD);
  await Promise.all([mp.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }), mp.getByRole('button', { name: 'Sign in', exact: true }).click()]);
  for (const path of [...MEMBER, ...DYNAMIC]) results.push({ role: 'member', ...(await scan(mp, path)) });
  await m.close();
  await browser.close();
  const totals = {};
  for (const r of results) for (const v of r.violations || []) totals[v.rule] = (totals[v.rule] || 0) + 1;
  console.log(JSON.stringify({ ran_at: new Date().toISOString(), axe: '4.10.3', theme: colorScheme, totals, results }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
