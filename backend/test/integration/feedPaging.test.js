'use strict';

/**
 * The ranked home feed orders by score, so it pages by position within a fixed
 * snapshot ("<ISO>|<offset>"), not by created_at. Before this, the app sent
 * `offset` (ignored by the API) and scrolling re-fetched page 1.
 */
const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, _res, next) => next(),
  optionalAuth: (req, _res, next) => { req.user = { id: 'u1', role: 'user' }; next(); },
}));
jest.mock('../../middleware/cache', () => ({ cacheMiddleware: () => (_req, _res, next) => next(), invalidateCache: jest.fn() }));
jest.mock('../../socket', () => ({ emitNotification: jest.fn() }));

const posts = require('../../routes/posts');
const { parseFeedCursor } = posts;

function app() {
  const a = express();
  a.use('/api/posts', posts);
  return a;
}

beforeEach(() => { pool.query.mockReset(); pool.query.mockResolvedValue({ rows: [] }); });

describe('parseFeedCursor', () => {
  it('starts a snapshot at now with no cursor', () => {
    const now = new Date('2026-10-16T10:00:00Z');
    expect(parseFeedCursor(undefined, now)).toEqual({ snapshot: now, offset: 0 });
  });

  it('reads snapshot and offset, and accepts an old timestamp-only cursor', () => {
    expect(parseFeedCursor('2026-10-16T10:00:00.000Z|30')).toEqual({ snapshot: new Date('2026-10-16T10:00:00Z'), offset: 30 });
    expect(parseFeedCursor('2026-10-16T10:00:00.000Z')).toEqual({ snapshot: new Date('2026-10-16T10:00:00Z'), offset: 0 });
  });

  it('rejects bad cursors', () => {
    for (const bad of ['nonsense', '2026-10-16T10:00:00Z|-1', '2026-10-16T10:00:00Z|1.5', '2026-10-16T10:00:00Z|999999']) {
      expect(parseFeedCursor(bad)).toBeNull();
    }
  });
});

describe('GET /api/posts?feed=true', () => {
  it('scores against the snapshot and pages with OFFSET', async () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({ id: `p${i}`, created_at: new Date() }));
    pool.query.mockImplementation(async (sql) => (/FROM posts p WHERE p.created_at < \$2/.test(sql) ? { rows } : { rows: [] }));
    const res = await request(app()).get('/api/posts?feed=true&limit=15&cursor=' + encodeURIComponent('2026-10-16T10:00:00.000Z|15'));
    expect(res.status).toBe(200);
    const [sql, params] = pool.query.mock.calls.find(([q]) => /FROM posts p WHERE p.created_at < \$2/.test(q));
    expect(sql).toMatch(/\$2::timestamptz-p\.created_at/);
    expect(sql).toMatch(/LIMIT \$1 OFFSET \$4/);
    expect(params[1]).toEqual(new Date('2026-10-16T10:00:00Z'));
    expect(params[3]).toBe(15);
    expect(res.body.next_cursor).toBe('2026-10-16T10:00:00.000Z|30');
  });

  it('ends paging on a short page', async () => {
    pool.query.mockImplementation(async (sql) => (/FROM posts p WHERE p.created_at < \$2/.test(sql) ? { rows: [{ id: 'p1', created_at: new Date() }] } : { rows: [] }));
    const res = await request(app()).get('/api/posts?feed=true&limit=15');
    expect(res.body.next_cursor).toBeNull();
  });

  it('rejects a malformed cursor', async () => {
    expect((await request(app()).get('/api/posts?feed=true&cursor=nonsense')).status).toBe(400);
  });
});
