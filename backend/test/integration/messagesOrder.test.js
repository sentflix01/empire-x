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
  emitNotification: jest.fn(), emitPresenceUpdated: jest.fn(), emitNewPost: jest.fn(), removeUserFromConversationRoom: jest.fn(),
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

beforeEach(() => { pool.query.mockReset(); jest.clearAllMocks(); });

const C1 = '11111111-1111-4111-8111-111111111111';

/** A conversation the signed-in user belongs to; the last call is the messages query. */
function memberOf(messagesRows = []) {
  pool.query.mockImplementation((sql) => {
    if (sql.startsWith('SELECT * FROM conversations')) return Promise.resolve({ rows: [{ id: C1, type: 'dm', participant_ids: '[]' }] });
    if (sql.startsWith('SELECT role FROM conversation_participants')) return Promise.resolve({ rows: [{ role: 'member' }] });
    if (sql.startsWith('SELECT user_id FROM conversation_participants')) return Promise.resolve({ rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] });
    return Promise.resolve({ rows: messagesRows });
  });
}
const messagesCall = () => pool.query.mock.calls.find(([sql]) => /FROM messages WHERE conversation_id/.test(sql));

describe('GET conversation messages', () => {
  it('loads the newest messages and returns them oldest-first', async () => {
    memberOf([{ id: 'm6' }, { id: 'm7' }]);
    const res = await request(buildApp()).get(`/api/messages/conversations/${C1}/messages?limit=2`);
    expect(res.status).toBe(200);
    const [sql, params] = messagesCall();
    expect(sql).toMatch(/ORDER BY created_at DESC, id DESC LIMIT \$2\s*\)\s*newest ORDER BY created_at ASC/);
    expect(params).toEqual([C1, 2]);
  });

  it('rejects an unparseable before cursor instead of failing in SQL', async () => {
    memberOf();
    const res = await request(buildApp()).get(`/api/messages/conversations/${C1}/messages?before=not-a-date`);
    expect(res.status).toBe(422);
    expect(messagesCall()).toBeUndefined();
  });

  it('falls back to the default page size for a non-numeric limit', async () => {
    memberOf();
    await request(buildApp()).get(`/api/messages/conversations/${C1}/messages?limit=abc`);
    expect(messagesCall()[1]).toEqual([C1, 100]);
  });

  it('answers 404 for an id that is not a conversation id', async () => {
    const res = await request(buildApp()).get('/api/messages/conversations/c1/messages');
    expect(res.status).toBe(404);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('presence visibility', () => {
  const socket = require('../../socket');

  it('hides another user\'s presence when they chose nobody', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // not blocked
      .mockResolvedValueOnce({ rows: [{ presence_visibility: 'nobody' }] });
    const U2 = '22222222-2222-4222-8222-222222222222';
    const res = await request(buildApp()).get(`/api/messages/presence/${U2}`);
    expect(res.body).toEqual({ user_id: U2, status: 'offline', last_seen: null, hidden: true });
  });

  it('does not fan out presence for a user who chose nobody', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // last_seen update
      .mockResolvedValueOnce({ rows: [{ presence_visibility: 'nobody' }] });
    const res = await request(buildApp()).put('/api/messages/presence').send({ status: 'online' });
    expect(res.status).toBe(200);
    expect(socket.emitPresenceUpdated).not.toHaveBeenCalled();
  });

  it('fans out presence by default', async () => {
    pool.query.mockResolvedValue({ rows: [{ presence_visibility: 'everyone' }] });
    await request(buildApp()).put('/api/messages/presence').send({ status: 'online' });
    expect(socket.emitPresenceUpdated).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'online' }));
  });
});
