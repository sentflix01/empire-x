#!/usr/bin/env node
/**
 * Frontend inventory: page routes from the App Router tree, and every /api path
 * the frontend source calls, matched against the backend endpoint inventory.
 *
 *   node note/2026-11-05-international-audit/scripts/inventory-frontend.mjs
 * Writes inventory/frontend-routes.json and inventory/api-crosscheck.json.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const audit = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(audit, '..', '..');
const fe = join(repo, 'frontend-next');
const SKIP = new Set(['node_modules', '.next', 'test', '__tests__', 'e2e', '__mocks__', 'public']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs|js)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

// ── Page routes ──────────────────────────────────────────────────────────────
const appDir = join(fe, 'app');
const special = /^(page|route|layout|loading|error|global-error|not-found|template|default|robots|sitemap|manifest|opengraph-image|icon)\.(tsx?|js)$/;
const routes = [];
for (const file of walk(appDir)) {
  const base = file.split('/').pop();
  if (!special.test(base)) continue;
  const segs = relative(appDir, dirname(file)).split('/').filter(Boolean);
  const url = '/' + segs.filter((s) => !/^\(.*\)$/.test(s)).join('/');
  const group = segs.find((s) => /^\(.*\)$/.test(s)) ?? null;
  routes.push({ kind: base.replace(/\.(tsx?|js)$/, ''), url, group, file: relative(repo, file) });
}
routes.sort((a, b) => a.url.localeCompare(b.url) || a.kind.localeCompare(b.kind));

// Public path rules, as the edge proxy applies them
const publicSrc = readFileSync(join(fe, 'lib', 'publicPaths.ts'), 'utf8');

// ── API calls in source ──────────────────────────────────────────────────────
const calls = new Map();
const re = /(['"`])(\/api\/[^'"`\s?#]*)/g;
for (const file of walk(fe)) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(re)) {
    let p = m[2].replace(/\$\{[^}]*\}/g, ':p').replace(/\/+$/, '');
    if (m[1] !== '`' && p.includes('${')) continue;
    const key = p;
    if (!calls.has(key)) calls.set(key, new Set());
    calls.get(key).add(relative(repo, file));
  }
}

const be = JSON.parse(readFileSync(join(audit, 'inventory', 'endpoints.json'), 'utf8')).endpoints;
const norm = (p) => p.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ':p').replace(/\/+$/, '');
const beSet = new Set(be.map((e) => norm(e.path)));
const toRegex = (p) => new RegExp('^' + p.split(':p').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+') + '$');
const beRegexes = [...beSet].map((p) => ({ p, r: toRegex(p) }));

const crosscheck = { frontend_calls: calls.size, matched: [], unmatched: [], dynamic: [] };
for (const [path, files] of [...calls].sort()) {
  const entry = { path, files: [...files].sort() };
  if (path.endsWith(':p') && path.split('/').length <= 3) { crosscheck.dynamic.push(entry); continue; }
  const hit = beSet.has(path) || beRegexes.some(({ r }) => r.test(path.replace(/:p/g, 'x'))) ||
    [...beSet].some((b) => b.startsWith(path + '/') || toRegex(b).test(path.replace(/:p/g, 'x')));
  (hit ? crosscheck.matched : crosscheck.unmatched).push(entry);
}

// Backend endpoints never referenced by the frontend (by prefix family)
const feNorm = [...calls.keys()];
crosscheck.backend_not_called = be
  .filter((e) => {
    const n = norm(e.path);
    return !feNorm.some((c) => c === n || toRegex(n).test(c.replace(/:p/g, 'x')) || toRegex(c).test(n.replace(/:p/g, 'x')));
  })
  .map((e) => `${e.method} ${e.path}`);

writeFileSync(join(audit, 'inventory', 'frontend-routes.json'), JSON.stringify({ count: routes.length, routes, public_paths_source: 'frontend-next/lib/publicPaths.ts', public_paths_excerpt: publicSrc.slice(0, 3000) }, null, 2) + '\n');
writeFileSync(join(audit, 'inventory', 'api-crosscheck.json'), JSON.stringify(crosscheck, null, 2) + '\n');
console.log(`routes=${routes.length} pages=${routes.filter((r) => r.kind === 'page').length} api_calls=${calls.size} matched=${crosscheck.matched.length} unmatched=${crosscheck.unmatched.length} dynamic=${crosscheck.dynamic.length} backend_not_called=${crosscheck.backend_not_called.length}`);
