/**
 * GET /api/products applies the paid-plan rule (decision 2026-10-24) to
 * everyone except a signed-in owner viewing their own seller_id. Guests used
 * to skip it because `undefined !== undefined` is false.
 */
import express from 'express';
import request from 'supertest';
import pool from '../db/pool';

jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth');
  return {
    ...actual,
    // Test stub: "x-test-user" stands in for a verified access token.
    optionalAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      const id = req.header('x-test-user');
      req.user = id ? ({ id, role: 'user', is_demo: false } as unknown as express.Request['user']) : null;
      next();
    },
  };
});

const query = (pool as unknown as { query: jest.Mock }).query;
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PAID_PLAN = /business_subscriptions paid_sub/;

function buildApp() {
  const app = express();
  app.use((req, _res, next) => { req.realOnly = true; next(); });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app.use('/api/products', require('../routes/products'));
  return app;
}

async function listSql(path: string, userId?: string): Promise<string> {
  query.mockReset().mockResolvedValue({ rows: [] });
  const req = request(buildApp()).get(path);
  const res = await (userId ? req.set('x-test-user', userId) : req);
  expect(res.status).toBe(200);
  const listCall = query.mock.calls.find(([sql]) => /FROM products p/.test(String(sql)));
  expect(listCall).toBeDefined();
  return String(listCall![0]);
}

describe('GET /api/products paid-plan rule', () => {
  it('applies to a guest without seller_id', async () => {
    expect(await listSql('/api/products')).toMatch(PAID_PLAN);
  });

  it('applies to a guest with a seller_id', async () => {
    expect(await listSql(`/api/products?seller_id=${OWNER}`)).toMatch(PAID_PLAN);
  });

  it('applies to a signed-in member without seller_id', async () => {
    expect(await listSql('/api/products', OWNER)).toMatch(PAID_PLAN);
  });

  it('applies to a member viewing another seller', async () => {
    expect(await listSql(`/api/products?seller_id=${OTHER}`, OWNER)).toMatch(PAID_PLAN);
  });

  it('is skipped only for the owner viewing their own listings', async () => {
    expect(await listSql(`/api/products?seller_id=${OWNER}`, OWNER)).not.toMatch(PAID_PLAN);
  });
});
