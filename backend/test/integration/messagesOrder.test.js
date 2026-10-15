'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  optionalAuth: (_req, _res, next) => next(),
}));
jest.mock('../../socket', () => ({
  emitNewMessage: jest.fn(), emitMessageEdited: jest.fn(), emitMessageDeleted: jest.fn(),
  emitNotification: jest.fn(), emitPresenceUpdated: jest.fn(), emitNewPost: jest.fn(),
}));
jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

const messages = require('../../routes/messages');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { id: 'user-1', role: 'user' }; next(); });
  app.use('/api/messages', messages);
  return app;
}

beforeEach(() => { pool.query.mockReset(); });

describe('GET conversation messages', () => {
  it('loads the newest messages and returns them oldest-first', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // isParticipant
      .mockResolvedValueOnce({ rows: [{ id: 'm6' }, { id: 'm7' }] });
    const res = await request(buildApp()).get('/api/messages/conversations/c1/messages?limit=2');
    expect(res.status).toBe(200);
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toMatch(/ORDER BY created_at DESC LIMIT \$2\s*\)\s*newest ORDER BY created_at ASC/);
    expect(params).toEqual(['c1', 2]);
  });

  it('rejects an unparseable before cursor instead of failing in SQL', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const res = await request(buildApp()).get('/api/messages/conversations/c1/messages?before=not-a-date');
    expect(res.status).toBe(422);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default page size for a non-numeric limit', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    await request(buildApp()).get('/api/messages/conversations/c1/messages?limit=abc');
    expect(pool.query.mock.calls[1][1]).toEqual(['c1', 100]);
  });
});
