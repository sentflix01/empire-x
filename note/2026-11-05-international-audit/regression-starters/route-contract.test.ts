// Copy to backend/__tests__/route-contract.test.ts. No extra dependencies.
// Guards F-001..F-006: every literal /api path in the frontend must match a registered backend route.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND_DIRS = ['app', 'components', 'views', 'lib', 'api', 'store', 'hooks'].map((d) => path.join(ROOT, 'frontend-next', d));
// Paths built entirely at runtime (e.g. `/api/${entity}`) cannot be checked statically.
// `/api/direct-orders/${id}/${action}` and `/api/social/${kind}/${id}` choose a literal
// segment at runtime; their real targets exist, so they are allowed explicitly.
// Expected result until F-001..F-006 are fixed: the test fails listing exactly those 16 paths.
const ALLOWED_DYNAMIC = [/^\/api\/:p(\/:p)?$/, /^\/api\/direct-orders\/:p\/:p$/, /^\/api\/social\/:p\/:p$/];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (['node_modules', '__tests__', 'test'].includes(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|js)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

function frontendPaths(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of FRONTEND_DIRS.flatMap((d) => walk(d))) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/(['"`])(\/api\/[^'"`\s?#]*)/g)) {
      const p = m[2].replace(/\$\{[^}]*\}/g, ':p').replace(/\/+$/, '');
      if (!found.has(p)) found.set(p, path.relative(ROOT, file));
    }
  }
  return found;
}

function backendRoutes(): RegExp[] {
  const index = fs.readFileSync(path.join(ROOT, 'backend/index.ts'), 'utf8');
  const mounts = [...index.matchAll(/app\.use\(\s*'([^']+)'\s*,\s*require\('\.\/routes\/([A-Za-z0-9_]+)'\)\s*\)/g)];
  const routes: RegExp[] = [];
  for (const [, prefix, mod] of mounts) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const router = require(path.join(ROOT, 'backend/routes', mod));
    for (const layer of (router.default ?? router).stack ?? []) {
      if (!layer.route) continue;
      const paths: string[] = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const p of paths) {
        const full = prefix + (p === '/' ? '' : p);
        // Escape literal characters first, then turn each :param into one path segment.
        const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        routes.push(new RegExp(`^${full.split(/:[A-Za-z_]\w*/).map(escape).join('[^/]+')}$`));
      }
    }
  }
  return routes;
}

test('every frontend /api call has a matching backend route', () => {
  const routes = backendRoutes();
  const missing = [...frontendPaths()]
    .filter(([p]) => !ALLOWED_DYNAMIC.some((r) => r.test(p)))
    .filter(([p]) => !routes.some((r) => r.test(p.replace(/:p/g, 'x'))))
    .map(([p, file]) => `${p}  (${file})`);
  expect(missing).toEqual([]);
});
