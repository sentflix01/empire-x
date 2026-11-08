/**
 * scripts/generate-api-docs.js — Generate the API reference from actual routes.
 *
 * Anti-drift tooling: parses backend/index.ts mount points and every
 * routes/*.ts file for router.<method>() registrations, then emits:
 *   - docs/backend/API_REFERENCE.md   (human-readable catalog)
 *   - backend/api-catalog.json        (machine-readable catalogue; git-ignored)
 *   - docs/backend/openapi.json       (OpenAPI 3.1 skeleton: paths, auth, errors)
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
const OUT_OPENAPI = path.join(ROOT, '..', 'docs', 'backend', 'openapi.json');

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

  // Detect router-level middleware applied to ALL routes in this file via
  // router.use(requireAuth, requireAdmin) or router.use(requireAuth).
  // These appear before any route handler and elevate every route in the file.
  const routerUseAdmin = /router\.use\([^)]*requireAdmin[^)]*\)/.test(src);
  const routerUseAuth  = !routerUseAdmin && /router\.use\([^)]*requireAuth[^)]*\)/.test(src);
  const routerLevelAuth = routerUseAdmin ? 'admin' : routerUseAuth ? 'auth' : null;

  // Matches router.get('/path', ... up to the end of the registration line.
  const re = /router\.(get|post|put|patch|delete|all)\(\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(src))) {
    const [, method, routePath] = m;
    // Look ahead ~2 lines for the middleware chain (registrations are one-liners
    // in this codebase, but wrap points exist).
    const startLine = src.slice(0, m.index).split('\n').length;
    const snippet = lines.slice(startLine - 1, startLine + 2).join(' ');
    const perRouteAuth = snippet.includes('requireAdmin') ? 'admin'
      : snippet.includes('requireAuth') ? 'auth'
      : snippet.includes('optionalAuth') ? 'optional'
      : null;
    // Router-level auth takes effect when no per-route middleware is present,
    // unless the per-route middleware is weaker (e.g. optional vs auth).
    const auth = perRouteAuth ?? routerLevelAuth ?? 'public';
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

/** Every mounted route, sorted by module and source line. */
function buildCatalog() {
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
  return catalog;
}

// ── 4. OpenAPI 3.1 (audit F-055) ─────────────────────────────────────────────
// Paths, path parameters, auth and the standard error responses come from the
// route sources. Request and response bodies are not described: the routes do
// not declare schemas. No timestamp, so an unchanged API gives an identical file.
function toOpenApiPath(fullPath) {
  const trimmed = fullPath.length > 1 ? fullPath.replace(/\/+$/, '') : fullPath;
  return trimmed.replace(/\*([A-Za-z_]\w*)/g, '{$1}').replace(/:([A-Za-z_]\w*)/g, '{$1}');
}

function toOpenApi(catalog) {
  const ref = (name) => ({ $ref: `#/components/responses/${name}` });
  const paths = {};
  const usedIds = new Set();
  for (const ep of catalog) {
    const p = toOpenApiPath(ep.full_path);
    const method = ep.method.toLowerCase();
    let id = `${method}_${p.replace(/^\/api\//, '').replace(/[{}]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'root'}`;
    while (usedIds.has(id)) id += '_';
    usedIds.add(id);
    const params = [...p.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1], in: 'path', required: true, schema: { type: 'string' },
      ...(ep.full_path.includes(`*${m[1]}`) ? { description: 'May contain slashes (wildcard route).' } : {}),
    }));
    const responses = { 200: { description: 'Success' } };
    if (['auth', 'admin'].includes(ep.auth)) responses[401] = ref('Unauthorized');
    if (ep.auth === 'admin') responses[403] = ref('Forbidden');
    if (params.length) responses[404] = ref('NotFound');
    if (['post', 'put', 'patch'].includes(method)) responses[422] = ref('ValidationError');
    responses[500] = ref('ServerError');
    const security = ep.auth === 'public' ? [] : ep.auth === 'optional' ? [{}, { bearerAuth: [] }] : [{ bearerAuth: [] }];
    paths[p] = paths[p] || {};
    paths[p][method] = {
      operationId: id,
      tags: [ep.module],
      summary: `${ep.method} ${p}`,
      security,
      ...(params.length ? { parameters: params } : {}),
      responses,
      'x-auth': ep.auth,
      'x-source': `backend/routes/${ep.module}.ts:${ep.line}`,
    };
  }
  const errorResponse = (description) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
  return {
    openapi: '3.1.0',
    info: {
      title: 'Nodbusiness API',
      version: '1',
      description: 'Generated from the route sources by backend/scripts/generate-api-docs.js (npm run docs:api). '
        + 'Lists every endpoint with its method, path parameters, sign-in requirement (x-auth: public, optional, auth, admin) and the standard error responses. '
        + 'Request and response bodies are not described yet; see the route source named in x-source. '
        + 'Every response carries the header API-Version: 1.',
    },
    servers: [
      { url: 'https://nodbusiness-backend-9psf.onrender.com', description: 'Production' },
      { url: 'http://localhost:3001', description: 'Local development' },
    ],
    tags: [...new Map(catalog.map((c) => [c.module, { name: c.module, description: c.title }])).values()],
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token from /api/auth/login or /api/auth/refresh (15 minutes).' } },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string', description: 'Human-readable message.' },
            code: { type: 'string', description: 'Machine-readable code, e.g. VALIDATION_ERROR, UNAUTHORIZED, TOKEN_EXPIRED, NOT_FOUND.' },
            request_id: { type: 'string', description: 'Matches the X-Request-ID header; quote it when reporting a problem.' },
          },
        },
      },
      responses: {
        Unauthorized: errorResponse('Not signed in, or the token is invalid, expired or revoked.'),
        Forbidden: errorResponse('Signed in but not allowed (for example ADMIN_REQUIRED or MFA_SETUP_REQUIRED).'),
        NotFound: errorResponse('Not found (also returned for malformed ids).'),
        ValidationError: errorResponse('The request body or query failed validation.'),
        ServerError: errorResponse('Unexpected server error.'),
      },
    },
  };
}

function main() {
  const catalog = buildCatalog();

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
  md.push('Sign-in failures (`requireAuth`, `requireAdmin`) use the same shape with these codes: `401 UNAUTHORIZED` (no token), `401 INVALID_TOKEN`, `401 TOKEN_EXPIRED` (refresh and retry), `401 TOKEN_REVOKED`, `401 USER_NOT_FOUND`, `403 ACCOUNT_SUSPENDED`, `403 ADMIN_REQUIRED`, `403 MFA_SETUP_REQUIRED`.');
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
  md.push('`backend/routes/`. Machine-readable versions: [`openapi.json`](openapi.json) (OpenAPI 3.1,');
  md.push('committed) and `backend/api-catalog.json` (generated locally).*');

  fs.writeFileSync(OUT_MD, md.join('\n'));

  fs.writeFileSync(OUT_OPENAPI, JSON.stringify(toOpenApi(catalog), null, 2) + '\n');

  console.log(`Generated ${OUT_MD}`);
  console.log(`Generated ${OUT_JSON}`);
  console.log(`Generated ${OUT_OPENAPI}`);
  console.log(`${catalog.length} endpoints across ${modules.length} modules`);
}

module.exports = { buildCatalog, toOpenApi, toOpenApiPath };
if (require.main === module) main();
