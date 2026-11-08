/**
 * docs/backend/openapi.json (audit F-055) matches the route sources and is a
 * structurally valid OpenAPI 3.1 document. Regenerate with `npm run docs:api`.
 */
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildCatalog, toOpenApi, toOpenApiPath } = require('../scripts/generate-api-docs.js');

type Operation = {
  operationId: string; tags: string[]; security: unknown[]; 'x-auth': string;
  parameters?: Array<{ name: string; in: string; required: boolean }>;
  responses: Record<string, unknown>;
};
type Spec = { openapi: string; info: { version: string }; paths: Record<string, Record<string, Operation>>; components: Record<string, Record<string, unknown>> };

const committed: Spec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'backend', 'openapi.json'), 'utf8'));
const catalog: Array<{ method: string; full_path: string; auth: string }> = buildCatalog();

describe('OpenAPI document', () => {
  it('is up to date with the routes (run `npm run docs:api` after changing a route)', () => {
    expect(committed).toEqual(toOpenApi(catalog));
  });

  it('lists every route once', () => {
    const ops = Object.values(committed.paths).flatMap((methods) => Object.values(methods));
    expect(ops).toHaveLength(catalog.length);
    for (const ep of catalog) {
      expect(committed.paths[toOpenApiPath(ep.full_path)]?.[ep.method.toLowerCase()]).toBeDefined();
    }
    const ids = ops.map((o) => o.operationId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('declares every path parameter and requires a token where the route does', () => {
    for (const [p, methods] of Object.entries(committed.paths)) {
      const inPath = [...p.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      for (const op of Object.values(methods)) {
        expect((op.parameters ?? []).filter((x) => x.in === 'path' && x.required).map((x) => x.name).sort()).toEqual(inPath);
        if (op['x-auth'] === 'auth' || op['x-auth'] === 'admin') {
          expect(op.security).toEqual([{ bearerAuth: [] }]);
          expect(op.responses['401']).toBeDefined();
        }
        if (op['x-auth'] === 'public') expect(op.security).toEqual([]);
      }
    }
  });

  it('is OpenAPI 3.1 with resolvable references', () => {
    expect(committed.openapi).toBe('3.1.0');
    expect(committed.info.version).toBe('1');
    const refs = JSON.stringify(committed).match(/"#\/components\/[^"]+"/g) ?? [];
    for (const ref of new Set(refs)) {
      const [, , group, name] = ref.replace(/"/g, '').split('/');
      expect(committed.components[group]?.[name]).toBeDefined();
    }
  });
});
