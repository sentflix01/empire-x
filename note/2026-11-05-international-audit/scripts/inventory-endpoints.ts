/**
 * Lists every HTTP endpoint the backend actually exposes, with its middleware
 * chain, by loading the real Express routers (no server is started).
 *
 *   source ~/.nodbusiness-local/env.sh
 *   cd backend && npx tsx ../note/2026-11-05-international-audit/scripts/inventory-endpoints.ts > ../note/2026-11-05-international-audit/inventory/endpoints.json
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const backend = resolve(process.cwd());
const indexSrc = readFileSync(join(backend, 'index.ts'), 'utf8');

// app.use('/api/x', require('./routes/y'))  — keep source order (Express matches in order)
const mounts = [...indexSrc.matchAll(/app\.use\(\s*'([^']+)'\s*,\s*require\('\.\/routes\/([A-Za-z0-9_]+)'\)\s*\)/g)]
  .map((m) => ({ prefix: m[1], module: m[2] }));

type Layer = { route?: { path: string | string[]; methods: Record<string, boolean>; stack: { name: string; handle: Function }[] }; name: string; handle: any; matchers?: unknown };

function classify(names: string[]): string {
  if (names.includes('requireAdmin')) return 'admin';
  if (names.includes('requireAuth')) return 'auth';
  if (names.includes('optionalAuth')) return 'optional';
  return 'none';
}

const endpoints: Record<string, unknown>[] = [];
for (const { prefix, module } of mounts) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(join(backend, 'routes', module));
  const router = mod?.default ?? mod;
  const stack: Layer[] = router?.stack ?? [];
  const routerLevel: string[] = [];
  for (const layer of stack) {
    if (!layer.route) { routerLevel.push(layer.name || 'anonymous'); continue; }
    const handlerNames = layer.route.stack.map((s) => s.name || 'anonymous');
    const chain = [...routerLevel, ...handlerNames.slice(0, -1)];
    const paths: string[] = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
    for (const method of Object.keys(layer.route.methods)) for (const routePath of paths) {
      endpoints.push({
        method: method.toUpperCase(),
        path: (prefix + (routePath === '/' ? '' : routePath)) || prefix,
        module: `routes/${module}.ts`,
        access: classify(chain),
        middleware: chain,
      });
    }
  }
}

process.stdout.write(JSON.stringify({ generated: new Date().toISOString(), mounts: mounts.length, count: endpoints.length, endpoints }, null, 2) + '\n');
// Route modules may open pools/timers on import; exit explicitly.
setTimeout(() => process.exit(0), 50);
