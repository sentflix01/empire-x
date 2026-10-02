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
jest.mock('../../routes/hashtags', () => ({ syncHashtags: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../socket', () => ({
  emitNewMessage: jest.fn(), emitMessageEdited: jest.fn(), emitMessageDeleted: jest.fn(),
  emitNotification: jest.fn(), emitPresenceUpdated: jest.fn(), emitNewPost: jest.fn(),
}));

const crud = require('../../utils/crud');
const posts = require('../../routes/posts');
const tasks = require('../../routes/tasks');
const profiles = require('../../routes/profiles');
const messages = require('../../routes/messages');
const notifications = require('../../routes/notifications');
const businesses = require('../../routes/businesses');
const events = require('../../routes/events');
const friends = require('../../routes/friends');
const jobs = require('../../routes/jobs');

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
    expect(crud.updateRecord).toHaveBeenCalledWith('posts', 'post-1', { content: 'Updated' });
  });

  it('does not let task owners replace requester identity', async () => {
    crud.getRecord.mockResolvedValue({ requester_id: 'user-1', status: 'open' });
    crud.updateRecord.mockResolvedValue({ id: 'task-1', title: 'Updated' });

    const response = await request(buildApp(tasks, '/api/tasks')).put('/api/tasks/task-1').send({
      requester_id: 'victim', title: 'Updated',
    });

    expect(response.status).toBe(200);
    expect(crud.updateRecord).toHaveBeenCalledWith('tasks', 'task-1', { title: 'Updated' });
  });

  it('limits bid listing to bids owned by the caller or attached to their tasks', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const response = await request(buildApp(tasks, '/api/tasks')).get('/api/tasks/bids?limit=200');

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain('(tb.bidder_id=$1 OR t.requester_id=$1)');
    expect(pool.query.mock.calls[0][1]).toEqual(['user-1', 200]);
  });

  it('does not expose another requester’s bids through a task id', async () => {
    crud.getRecord.mockResolvedValue({ requester_id: 'task-owner' });

    const response = await request(buildApp(tasks, '/api/tasks')).get('/api/tasks/task-1/bids');

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('does not let users choose business ids or timestamps when creating a business', async () => {
    crud.createRecord.mockResolvedValue({ id: 'business-new', owner_id: 'user-1' });

    const response = await request(buildApp(businesses, '/api/businesses')).post('/api/businesses').send({
      id: 'victim-business', owner_id: 'victim', created_at: '2000-01-01', updated_at: '2000-01-01',
      business_name: 'My business', business_category: 'Retail',
    });

    expect(response.status).toBe(201);
    expect(crud.createRecord).toHaveBeenCalledWith('businesses', {
      business_name: 'My business', business_category: 'Retail', owner_id: 'user-1',
    });
  });

  it('serializes event capacity checks so concurrent bookings cannot exceed capacity', async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes('SELECT id,status,capacity FROM events')) {
          return { rows: [{ id: 'event-1', status: 'published', capacity: 1 }] };
        }
        if (sql.includes('SELECT COUNT(*) FROM event_tickets')) return { rows: [{ count: '1' }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);

    const response = await request(buildApp(events, '/api/events')).post('/api/events/event-1/book');

    expect(response.status).toBe(400);
    const eventLock = client.query.mock.calls.find(([sql]) => sql.includes('SELECT id,status,capacity FROM events'));
    expect(eventLock[0]).toContain('FOR UPDATE');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO event_tickets'))).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });

  it('excludes demo attendees from Real-mode event capacity and attendee lists', async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes('SELECT id,status,capacity FROM events')) {
          return { rows: [{ id: 'event-1', status: 'published', capacity: 1 }] };
        }
        if (sql.includes('SELECT COUNT(*) FROM event_tickets')) return { rows: [{ count: '0' }] };
        if (sql.includes('INSERT INTO event_tickets')) return { rows: [{ id: 'ticket-1' }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);

    const booking = await request(buildApp(events, '/api/events'))
      .post('/api/events/event-1/book').set('x-real-only', '1');

    expect(booking.status).toBe(201);
    const capacitySql = client.query.mock.calls.find(([sql]) => sql.includes('SELECT COUNT(*) FROM event_tickets'))[0];
    expect(capacitySql).toContain('is_seed=FALSE AND is_demo=FALSE');

    pool.query.mockResolvedValue({ rows: [] });
    const attendees = await request(buildApp(events, '/api/events'))
      .get('/api/events/event-1/attendees').set('x-real-only', '1');
    expect(attendees.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain('is_seed=FALSE AND is_demo=FALSE');
  });

  it('filters demo users out of Real-mode mutual friend results', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const response = await request(buildApp(friends, '/api/friends'))
      .get('/api/friends/mutual').set('x-real-only', '1');

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0].match(/u\.is_seed=FALSE AND u\.is_demo=FALSE/g)).toHaveLength(2);
  });

  it('filters demo applicants from Real-mode job application lists', async () => {
    crud.getRecord.mockResolvedValue({ poster_id: 'user-1' });
    pool.query.mockResolvedValue({ rows: [] });

    const response = await request(buildApp(jobs, '/api/jobs'))
      .get('/api/jobs/job-1/applications').set('x-real-only', '1');

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain('applicant.is_seed=FALSE AND applicant.is_demo=FALSE');
  });

  it('prevents a non-owner from changing a job application status', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'application-1', poster_id: 'job-owner' }] });

    const response = await request(buildApp(jobs, '/api/jobs'))
      .put('/api/jobs/applications/application-1').send({ status: 'accepted' });

    expect(response.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('lets the job owner update an application using an allowed status', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'application-1', poster_id: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'application-1', status: 'accepted' }] });

    const response = await request(buildApp(jobs, '/api/jobs'))
      .put('/api/jobs/applications/application-1').send({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[1][1]).toEqual(['accepted', 'application-1']);
  });

  it('does not let bidders replace their identity in pending bid updates', async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes('SELECT task_id FROM task_bids')) return { rows: [{ task_id: 'task-1' }] };
        if (sql.includes('SELECT id, requester_id, status FROM tasks')) return { rows: [{ id: 'task-1', requester_id: 'requester-1', status: 'open' }] };
        if (sql.includes('SELECT * FROM task_bids')) return { rows: [{ id: 'bid-1', task_id: 'task-1', bidder_id: 'user-1', status: 'pending' }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);

    const response = await request(buildApp(tasks, '/api/tasks')).put('/api/tasks/bids/bid-1').send({ bidder_id: 'victim' });

    expect(response.status).toBe(400);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('UPDATE task_bids'))).toBe(false);
    expect(client.release).toHaveBeenCalled();
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

  it('accepts a bid and rejects competing pending bids inside one transaction', async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes('SELECT task_id FROM task_bids')) return { rows: [{ task_id: 'task-1' }] };
        if (sql.includes('SELECT id, requester_id, status FROM tasks')) return { rows: [{ id: 'task-1', requester_id: 'user-1', status: 'open' }] };
        if (sql.includes('SELECT * FROM task_bids')) return { rows: [{ id: 'bid-1', task_id: 'task-1', bidder_id: 'bidder-1', status: 'pending' }] };
        if (sql.includes('UPDATE task_bids SET status=$1')) return { rows: [{ id: 'bid-1', status: 'accepted' }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);
    pool.query.mockResolvedValue({ rows: [] });

    const response = await request(buildApp(tasks, '/api/tasks')).put('/api/tasks/bids/bid-1').send({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(client.query.mock.calls.some(([sql]) => sql.includes("status='rejected'") && sql.includes("status='pending'"))).toBe(true);
    expect(client.query.mock.calls.findIndex(([sql]) => sql.includes('SELECT id, requester_id, status FROM tasks')))
      .toBeLessThan(client.query.mock.calls.findIndex(([sql]) => sql.includes('SELECT * FROM task_bids')));
    expect(client.query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(true);
  });
});
