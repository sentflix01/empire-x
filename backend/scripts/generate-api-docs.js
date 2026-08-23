/**
 * scripts/generate-api-docs.js — Generate the API reference from actual routes.
 *
 * Anti-drift tooling: parses backend/index.ts mount points and every
 * routes/*.ts file for router.<method>() registrations, then emits:
 *   - docs/backend/API_REFERENCE.md   (human-readable catalog)
 *   - backend/api-catalog.json        (machine-readable; future OpenAPI seed)
 *
 * Regenerate after ANY route change and include the result in the same PR:
 *   npm run docs:api
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'routes');
const OUT_MD = path.join(ROOT, '..', 'docs', 'backend', 'API_REFERENCE.md');
const OUT_JSON = path.join(ROOT, 'api-catalog.json');

// ── 1. Mount points from index.ts ────────────────────────────────────────────
function parseMounts() {
  const indexSrc = fs.readFileSync(path.join(ROOT, 'index.ts'), 'utf8');
  const mounts = [];
  const re = /app\.use\('([^']+)',\s*require\('\.\/routes\/([a-zA-Z]+)'\)\)/g;
  let m;
  while ((m = re.exec(indexSrc))) {
    const [_, mountPath, file] = m;
    const existing = mounts.find(x => x.file === file);
    if (existing) existing.paths.push(mountPath);
    else mounts.push({ file, paths: [mountPath] });
  }
  return mounts;
}

// ── 2. Route declarations from each route file ───────────────────────────────
function parseRoutes(file) {
  const src = fs.readFileSync(path.join(ROUTES_DIR, `${file}.ts`), 'utf8');
  const lines = src.split(/\r?\n/);
  const routes = [];
  // Matches router.get('/path', ... up to the end of the registration line.
  const re = /router\.(get|post|put|patch|delete|all)\(\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(src))) {
    const [, method, routePath] = m;
    // Look ahead ~2 lines for the middleware chain (registrations are one-liners
    // in this codebase, but wrap points exist).
    const startLine = src.slice(0, m.index).split('\n').length;
    const snippet = lines.slice(startLine - 1, startLine + 2).join(' ');
    const auth = snippet.includes('requireAdmin') ? 'admin'
      : snippet.includes('requireAuth') ? 'auth'
      : snippet.includes('optionalAuth') ? 'optional'
      : 'public';
    routes.push({ method: method.toUpperCase(), path: routePath, auth, line: startLine });
  }
  return routes;
}

// ── 3. Human-friendly module titles (from the file header comment) ───────────
function moduleTitle(file) {
  try {
    const src = fs.readFileSync(path.join(ROUTES_DIR, `${file}.ts`), 'utf8').split(/\r?\n/).slice(0, 5);
    const titleLine = src.find(l => /^ \* routes\//.test(l));
    if (titleLine) return titleLine.replace(/^ \* routes\/\S+ —?\s*/, '').replace(/—.*$/, '').trim();
    // eslint-disable-next-line no-useless-escape
    const dash = src.find(l => l.includes('—'));
    if (dash) return dash.replace(/^[\s/*]+/, '').replace(/^routes\/\S+\s*/, '').trim();
  } catch { /* fall through */ }
  return file;
}

function main() {
  const mounts = parseMounts();
  const catalog = [];
  for (const { file, paths } of mounts) {
    if (!fs.existsSync(path.join(ROUTES_DIR, `${file}.ts`))) continue;
    const routes = parseRoutes(file);
    const title = moduleTitle(file);
    for (const r of routes) {
      for (const mp of paths) {
        catalog.push({
          module: file,
          title,
          full_path: mp.replace(/\/$/, '') + r.path,
          ...r,
        });
      }
    }
  }

  // Sort by module then by original order within the file (line number).
  catalog.sort((a, b) => a.module.localeCompare(b.module) || a.line - b.line || a.path.localeCompare(b.path));

  fs.writeFileSync(OUT_JSON, JSON.stringify({ generated_at: new Date().toISOString(), count: catalog.length, endpoints: catalog }, null, 2));

  // ── Markdown ────────────────────────────────────────────────────────────────
  const modules = [...new Set(catalog.map(c => c.module))];
  const md = [];
  md.push('# Nodbusiness — API Reference');
  md.push('');
  md.push('> **AUTO-GENERATED** from the route sources by `backend/scripts/generate-api-docs.js`.');
  md.push('> Do not hand-edit. After any route change run `npm run docs:api` (in `backend/`)');
  md.push('> and commit the regenerated file in the same PR.');
  md.push(`> Endpoints: **${catalog.length}** across **${modules.length}** mounted modules · Generated: ${new Date().toISOString().slice(0, 10)}`);
  md.push('');
  md.push('| Legend | Meaning |');
  md.push('|---|---|');
  md.push('| 🔒 auth | Valid access token required (`requireAuth`) |');
  md.push('| 👑 admin | Admin role required (`requireAuth` + `requireAdmin`) |');
  md.push('| ⚪ optional | Token personalizes the response when present |');
  md.push('| 🌐 public | No token required |');
  md.push('');
  md.push('Standard error shape: `{ "error": string, "code": string, "request_id"?: string }`');
  md.push('with `422 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `500 INTERNAL_ERROR`. Every response also carries `API-Version: 1`.');
  md.push('');
  md.push('## Contents');
  for (const mod of modules) {
    const count = catalog.filter(c => c.module === mod).length;
    const anchor = mod.toLowerCase();
    md.push(`- [\`${mod}\`](#${anchor}) (${count})`);
  }
  md.push('');

  let currentModule = '';
  for (const ep of catalog) {
    if (ep.module !== currentModule) {
      currentModule = ep.module;
      md.push('');
      md.push(`## ${ep.module} — ${ep.title}`);
      md.push('');
      md.push('| Method | Path | Auth | Source |');
      md.push('|---|---|---|---|');
    }
    const icon = { admin: '👑', auth: '🔒', optional: '⚪', public: '🌐' }[ep.auth];
    md.push(`| \`${ep.method}\` | \`${ep.full_path}\` | ${icon} ${ep.auth} | routes/${ep.module}.ts:${ep.line} |`);
  }
  md.push('');
  md.push('---');
  md.push('');
  md.push('*Endpoint-level request/response schemas live in the module source under');
  md.push('`backend/routes/` — the JSON twin of this page is `backend/api-catalog.json`.*');

  fs.writeFileSync(OUT_MD, md.join('\n'));

  console.log(`Generated ${OUT_MD}`);
  console.log(`Generated ${OUT_JSON}`);
  console.log(`${catalog.length} endpoints across ${modules.length} modules`);
}

main();
