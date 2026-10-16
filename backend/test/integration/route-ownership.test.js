'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  optionalAuth: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: () => (_req, _res, next) => next(),
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/crud', () => ({
  getRecord: jest.fn(),
  listRecords: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
  deleteRecord: jest.fn(),
  withoutProtectedFields: (data, ownerColumn) => {
    const safe = { ...data };
    for (const field of ['id', 'created_at', 'updated_at', ownerColumn]) delete safe[field];
    return safe;
  },
}));
jest.mock('../../routes/hashtags', () => ({
  syncHashtags: jest.fn().mockResolvedValue(undefined),
  resyncHashtags: jest.fn().mockResolvedValue(undefined),
  unlinkHashtags: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../socket', () => ({
  emitNewMessage: jest.fn(), emitMessageEdited: jest.fn(), emitMessageDeleted: jest.fn(),
  emitNotification: jest.fn(), emitPresenceUpdated: jest.fn(), emitNewPost: jest.fn(),
}));

const crud = require('../../utils/crud');
const posts = require('../../routes/posts');
const profiles = require('../../routes/profiles');
const messages = require('../../routes/messages');
const notifications = require('../../routes/notifications');
const businesses = require('../../routes/businesses');
const friends = require('../../routes/friends');

function buildApp(router, base, user = { id: 'user-1', role: 'user' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    req.realOnly = req.headers['x-real-only'] === '1';
    next();
  });
  app.use(base, router);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockReset();
});

describe('route ownership and mass assignment boundaries', () => {
  it('does not let a post author replace author identity or engagement counters', async () => {
    crud.getRecord.mockResolvedValue({ author_id: 'user-1' });
    crud.updateRecord.mockResolvedValue({ id: 'post-1', content: 'Updated' });

    const response = await request(buildApp(posts, '/api/posts')).put('/api/posts/post-1').send({
      content: 'Updated', author_id: 'victim', like_count: 999, created_at: '2000-01-01',
    });

    expect(response.status).toBe(200);
    expect(crud.updateRecord).toHaveBeenCalledWith('posts', 'post-1', { content: 'Updated', edited_at: expect.any(String) });
  });




  it('does not let users choose business ids or timestamps when creating a business', async () => {
    pool.query.mockResolvedValue({ rows: [{ blocked: false }] });
    crud.createRecord.mockResolvedValue({ id: 'business-new', owner_id: 'user-1' });

    const response = await request(buildApp(businesses, '/api/businesses')).post('/api/businesses').send({
      id: 'victim-business', owner_id: 'victim', created_at: '2000-01-01', updated_at: '2000-01-01',
      business_name: 'My business', business_category: 'Retail',
    });

    expect(response.status).toBe(201);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM business_creation_blocks'), ['user-1']);
    expect(crud.createRecord).toHaveBeenCalledWith('businesses', {
      business_name: 'My business', business_category: 'Retail', owner_id: 'user-1',
    });
  });

  it('blocks business creation during the subscription restriction period', async () => {
    pool.query.mockResolvedValue({ rows: [{ blocked: true }] });

    const response = await request(buildApp(businesses, '/api/businesses')).post('/api/businesses').send({
      business_name: 'My business', business_category: 'Retail',
    });

    expect(response.status).toBe(423);
    expect(response.body.error).toBe('business_creation_blocked');
    expect(crud.createRecord).not.toHaveBeenCalled();
  });


  it('filters demo users out of Real-mode mutual friend results', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const response = await request(buildApp(friends, '/api/friends'))
      .get('/api/friends/mutual').set('x-real-only', '1');

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0].match(/u\.is_seed=FALSE AND u\.is_demo=FALSE/g)).toHaveLength(2);
  });





  it('does not let profile owners self-verify or change counters and identity', async () => {
    crud.getRecord.mockResolvedValue({ id: 'profile-1', user_id: 'user-1' });

    const response = await request(buildApp(profiles, '/api/profiles')).put('/api/profiles/profile-1').send({
      user_id: 'victim', is_verified: true, follower_count: 10000, points: 999999,
    });

    expect(response.status).toBe(400);
    expect(crud.updateRecord).not.toHaveBeenCalled();
  });

  it('returns a public profile projection without personal phone, coordinates, or private JSON buckets', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'profile-2', user_id: 'other-user', display_name: 'Public name' }] });

    const response = await request(buildApp(profiles, '/api/profiles')).get('/api/profiles/by-user/other-user');

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).not.toContain('up.*');
    expect(pool.query.mock.calls[0][0]).not.toContain('up.phone');
    expect(pool.query.mock.calls[0][0]).not.toContain('up.latitude');
    expect(pool.query.mock.calls[0][0]).not.toContain('up.extra_json');
  });

  it('filters server-owned fields when a user creates their own profile', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    crud.createRecord.mockResolvedValue({ id: 'profile-new', user_id: 'user-1', display_name: 'New name' });

    const response = await request(buildApp(profiles, '/api/profiles')).post('/api/profiles').send({
      user_id: 'victim', display_name: ' New name ', is_verified: true, follower_count: 999, points: 9999,
    });

    expect(response.status).toBe(201);
    expect(crud.createRecord).toHaveBeenCalledWith('user_profiles', {
      display_name: 'New name', user_id: 'user-1',
    });
  });

  it('does not let conversation admins rewrite participant or admin identity through metadata updates', async () => {
    crud.getRecord.mockResolvedValue({ id: 'conversation-1' });
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const response = await request(buildApp(messages, '/api/messages', { id: 'admin-1', role: 'user' }))
      .put('/api/messages/conversations/conversation-1')
      .send({ admin_id: 'victim', participant_ids: '["victim"]', last_message: 'spoofed' });

    expect(response.status).toBe(400);
    expect(crud.updateRecord).not.toHaveBeenCalled();
  });

  it('prevents users from sending fabricated notifications to other accounts', async () => {
    const response = await request(buildApp(notifications, '/api/notifications')).post('/api/notifications').send({
      user_id: 'victim', type: 'order', title: 'Click my link', link: 'https://example.invalid',
    });

    expect(response.status).toBe(403);
    expect(crud.createRecord).not.toHaveBeenCalled();
  });


});
