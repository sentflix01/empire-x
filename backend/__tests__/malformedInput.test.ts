/**
 * Malformed input answers 4xx, not 500 (audit F-034): non-UUID IDs never
 * reach Postgres, and a body no parser understands is treated as empty.
 */
import express from 'express';
import request from 'supertest';
import pool from '../db/pool';
import defaultBody from '../middleware/defaultBody';

const query = (pool as unknown as { query: jest.Mock }).query;

// Mount points as in index.ts.
const MOUNTS: Array<[string, string]> = [
  ['/api/profiles', '../routes/profiles'],
  ['/api/posts', '../routes/posts'],
  ['/api/products', '../routes/products'],
  ['/api/orders', '../routes/orders'],
  ['/api/profile-partnerships', '../routes/profilePartnerships'],
  ['/api/businesses', '../routes/businesses'],
  ['/api/showrooms', '../routes/showrooms'],
  ['/api/stories', '../routes/stories'],
  ['/api/reviews', '../routes/reviews'],
  ['/api/variants', '../routes/variants'],
  ['/api/delivery', '../routes/delivery'],
  ['/api/share-preview', '../routes/sharePreview'],
  ['/api/locations', '../routes/locations'],
];

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(defaultBody);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  for (const [base, mod] of MOUNTS) app.use(base, require(mod));
  app.all('/{*path}', (_req, res) => { res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' }); });
  return app;
}

// Every route the audit found answering 500 for 'not-a-uuid' (evidence/wave3/non-uuid-ids.txt), plus writes on the same params.
const MALFORMED: Array<[string, string]> = [
  ['get', '/api/businesses/not-a-uuid'],
  ['get', '/api/delivery/order/not-a-uuid'],
  ['get', '/api/locations/not-a-uuid'],
  ['get', '/api/orders/not-a-uuid'],
  ['get', '/api/posts/not-a-uuid'],
  ['get', '/api/products/not-a-uuid'],
  ['get', '/api/profile-partnerships/profile/not-a-uuid'],
  ['get', '/api/profiles/not-a-uuid'],
  ['get', '/api/profiles/by-user/not-a-uuid'],
  ['get', '/api/reviews/product/not-a-uuid'],
  ['get', '/api/share-preview/product/not-a-uuid'],
  ['get', '/api/showrooms/not-a-uuid'],
  ['get', '/api/stories/user/not-a-uuid'],
  ['get', '/api/variants/product/not-a-uuid'],
  ['put', '/api/products/not-a-uuid'],
  ['delete', '/api/posts/00000000-0000-0000-0000-000000000000/comments/not-a-uuid'],
  ['put', '/api/businesses/00000000-0000-0000-0000-000000000000/payment-accounts/1'],
];

describe('malformed IDs', () => {
  const app = buildApp();
  beforeEach(() => { query.mockReset().mockRejectedValue(Object.assign(new Error('invalid input syntax for type uuid'), { code: '22P02' })); });

  it.each(MALFORMED)('%s %s answers 404 without querying the database', async (method, url) => {
    const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method](url);
    expect(res.status).toBe(404);
    expect(query).not.toHaveBeenCalled();
  });

  it('still routes valid UUIDs and non-ID paths to their handlers', async () => {
    query.mockReset().mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/share-preview/product/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(query).toHaveBeenCalled();
    query.mockClear();
    await request(app).get('/api/showrooms/slug/some-slug');
    expect(query).toHaveBeenCalled();
  });
});

describe('bodies no parser understands', () => {
  it('reach the handler as an empty object', async () => {
    const app = express();
    app.use(express.json());
    app.use(defaultBody);
    app.post('/echo', (req, res) => { const { email } = req.body as { email?: string }; res.status(400).json({ email: email ?? null }); });
    const res = await request(app).post('/echo').set('Content-Type', 'text/plain').send('email=a&password=b');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ email: null });
  });

  it('do not stop a later route-level parser', async () => {
    const app = express();
    app.use(express.json());
    app.use(defaultBody);
    app.post('/form', express.urlencoded({ extended: false }), (req, res) => { res.json(req.body); });
    const res = await request(app).post('/form').type('form').send('a=1');
    expect(res.body).toEqual({ a: '1' });
  });
});
