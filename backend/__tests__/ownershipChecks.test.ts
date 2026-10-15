import express from 'express';
import request from 'supertest';
import pool from '../db/pool';
import variantsRouter from '../routes/variants';
import messagesRouter from '../routes/messages';
import webhooksRouter from '../routes/businessWebhooks';
import apiKeysRouter from '../routes/businessApiKeys';

// Audit 2026-10-15: F-H2 (variants), F-H7 (message forward), F-H6 (webhook and
// API key update/revoke).

jest.mock('../middleware/auth', () => {
  const setUser = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: { id: string; role: string } }).user = {
      id: req.header('x-user-id') ?? 'user-a',
      role: req.header('x-user-role') ?? 'user',
    };
    next();
  };
  return { requireAuth: setUser, optionalAuth: setUser };
});
// The webhook/API key PUT/DELETE routes must not depend on checkTierLimit; it
// is only mounted on GET/POST, and blocks if called here.
jest.mock('../middleware/tierLimit', () => ({
  checkTierLimit: () => (_req: express.Request, res: express.Response) => { res.status(402).json({ error: 'Upgrade required' }); },
}));
jest.mock('../lib/queue', () => ({ queueWebhookDelivery: jest.fn(), queueUsageRecalc: jest.fn() }));
jest.mock('../services/ssrfValidator', () => ({ validateUrl: jest.fn().mockResolvedValue({ ok: true }) }));
jest.mock('../socket', () => ({
  emitNewMessage: jest.fn(), emitMessageEdited: jest.fn(), emitMessageDeleted: jest.fn(),
  emitNotification: jest.fn(), emitPresenceUpdated: jest.fn(),
}));
jest.mock('../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../lib/redis', () => ({ getRedis: () => null }));

const mockPool = pool as unknown as { query: jest.Mock };
const app = express();
app.use(express.json());
app.use('/api/variants', variantsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/business-webhooks', webhooksRouter);
app.use('/api/business-api-keys', apiKeysRouter);

const sqlCalls = () => mockPool.query.mock.calls.map(([sql]) => String(sql));

beforeEach(() => {
  jest.clearAllMocks();
  mockPool.query.mockReset();
  mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('F-H2 variant ownership', () => {
  const ownedBy = (sellerId: string) => (sql: string) => (
    sql.includes('JOIN products p') ? Promise.resolve({ rows: [{ seller_id: sellerId }] })
      : Promise.resolve({ rows: [{ id: 'variant-1' }], rowCount: 1 })
  );

  it.each(['put', 'delete'] as const)('rejects %s from a user who does not own the product', async (method) => {
    mockPool.query.mockImplementation(ownedBy('user-a'));
    const response = await request(app)[method]('/api/variants/variant-1').set('x-user-id', 'user-b').send({ price: 1, stock: 999 });
    expect(response.status).toBe(403);
    expect(sqlCalls().some((sql) => /UPDATE product_variants|DELETE FROM product_variants/.test(sql))).toBe(false);
  });

  it.each(['put', 'delete'] as const)('allows %s by the product seller', async (method) => {
    mockPool.query.mockImplementation(ownedBy('user-a'));
    const response = await request(app)[method]('/api/variants/variant-1').set('x-user-id', 'user-a').send({ price: 5 });
    expect(response.status).toBe(200);
    expect(mockPool.query.mock.calls[0][1]).toEqual(['variant-1']);
  });

  it('allows an admin to delete any variant', async () => {
    mockPool.query.mockImplementation(ownedBy('user-a'));
    const response = await request(app).delete('/api/variants/variant-1').set('x-user-id', 'admin-1').set('x-user-role', 'admin');
    expect(response.status).toBe(200);
    expect(sqlCalls()).toContain('DELETE FROM product_variants WHERE id=$1');
  });

  it('returns 404 for a variant that does not exist', async () => {
    const response = await request(app).delete('/api/variants/missing').set('x-user-id', 'user-a');
    expect(response.status).toBe(404);
  });
});

describe('F-H7 message forward requires access to the source conversation', () => {
  // conv-private holds user-a and user-b; conv-own holds only user-c.
  const members: Record<string, string[]> = { 'conv-private': ['user-a', 'user-b'], 'conv-own': ['user-c', 'user-a'] };
  beforeEach(() => {
    mockPool.query.mockImplementation((sql: string, params: string[] = []) => {
      if (sql.startsWith('SELECT * FROM messages')) {
        return Promise.resolve({ rows: [{ id: 'msg-1', conversation_id: 'conv-private', content: 'secret', type: 'text' }] });
      }
      if (sql.startsWith('SELECT 1 FROM conversation_participants')) {
        return Promise.resolve({ rows: (members[params[0]] ?? []).includes(params[1]) ? [{ '?column?': 1 }] : [] });
      }
      if (sql.startsWith('SELECT COUNT(*) FROM conversation_participants')) {
        return Promise.resolve({ rows: [{ count: String((members[params[0]] ?? []).length) }] });
      }
      if (sql.startsWith('INSERT INTO messages')) {
        return Promise.resolve({ rows: [{ id: 'msg-2', conversation_id: params[0], content: params[3] }] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  it('refuses an outsider who belongs to the target but not the source conversation', async () => {
    const response = await request(app).post('/api/messages/messages/msg-1/forward')
      .set('x-user-id', 'user-c').send({ target_conversation_id: 'conv-own' });
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain('secret');
    expect(sqlCalls().some((sql) => sql.startsWith('INSERT INTO messages'))).toBe(false);
  });

  it('lets a participant of both conversations forward', async () => {
    const response = await request(app).post('/api/messages/messages/msg-1/forward')
      .set('x-user-id', 'user-a').send({ target_conversation_id: 'conv-own' });
    expect(response.status).toBe(201);
    expect(response.body.content).toBe('secret');
  });
});

describe('F-H6 webhook and API key ownership without checkTierLimit', () => {
  const ownerScope = 'business_id IN (SELECT id FROM businesses WHERE owner_id = $2)';

  it('lets the owner disable a webhook, scoped to the businesses they own', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'wh-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'wh-1', is_enabled: false }] });
    const response = await request(app).put('/api/business-webhooks/wh-1').set('x-user-id', 'owner-1').send({ is_enabled: false });
    expect(response.status).toBe(200);
    expect(response.body.is_enabled).toBe(false);
    const [select, update] = mockPool.query.mock.calls;
    expect(select[0]).toContain(ownerScope);
    expect(select[1]).toEqual(['wh-1', 'owner-1']);
    expect(update[0]).toContain(ownerScope);
    expect(update[1]).toEqual(['wh-1', 'owner-1', false]);
  });

  it('lets the owner delete a webhook', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const response = await request(app).delete('/api/business-webhooks/wh-1').set('x-user-id', 'owner-1');
    expect(response.status).toBe(200);
    expect(mockPool.query.mock.calls[0][0]).toContain(ownerScope);
    expect(mockPool.query.mock.calls[0][1]).toEqual(['wh-1', 'owner-1']);
  });

  it("returns 404 for another owner's webhook", async () => {
    const response = await request(app).delete('/api/business-webhooks/wh-1').set('x-user-id', 'stranger');
    expect(response.status).toBe(404);
    expect(mockPool.query.mock.calls[0][1]).toEqual(['wh-1', 'stranger']);
  });

  it('lets the owner revoke an API key without touching a missing updated_at column', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const response = await request(app).delete('/api/business-api-keys/key-1').set('x-user-id', 'owner-1');
    expect(response.status).toBe(200);
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).toContain(ownerScope);
    expect(sql).not.toContain('updated_at');
    expect(params).toEqual(['key-1', 'owner-1']);
  });
});
