'use strict';

/** POST /api/internal/jobs/:name — scheduled jobs for a host that sleeps. */
const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../lib/directOrderExpiry', () => ({ runDirectOrderExpiry: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../db/cleanupStories', () => ({ deleteExpiredStories: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../scripts/business-subscription-lifecycle', () => ({
  runBusinessSubscriptionLifecycle: jest.fn().mockResolvedValue({ notices: 1, removed: 0 }),
}));

const lifecycle = require('../../scripts/business-subscription-lifecycle');
const jobs = require('../../routes/internalJobs');
const SECRET = 'x'.repeat(40);

function app() {
  const a = express();
  a.use('/api/internal', jobs);
  return a;
}

function mockLock(locked) {
  const client = { query: jest.fn(async (sql) => (/pg_try_advisory_lock/.test(sql) ? { rows: [{ locked }] } : { rows: [] })), release: jest.fn() };
  pool.connect.mockResolvedValueOnce(client);
  return client;
}

beforeEach(() => { jest.clearAllMocks(); pool.connect.mockReset(); process.env.JOBS_SECRET = SECRET; });
afterAll(() => { delete process.env.JOBS_SECRET; });

describe('internal jobs', () => {
  it('does not exist without a strong JOBS_SECRET', async () => {
    process.env.JOBS_SECRET = 'short';
    expect((await request(app()).post('/api/internal/jobs/subscription-lifecycle').set('Authorization', 'Bearer short')).status).toBe(404);
    delete process.env.JOBS_SECRET;
    expect((await request(app()).post('/api/internal/jobs/subscription-lifecycle')).status).toBe(404);
  });

  it('rejects a wrong or missing token', async () => {
    expect((await request(app()).post('/api/internal/jobs/subscription-lifecycle')).status).toBe(401);
    expect((await request(app()).post('/api/internal/jobs/subscription-lifecycle').set('Authorization', `Bearer ${'y'.repeat(40)}`)).status).toBe(401);
    expect(lifecycle.runBusinessSubscriptionLifecycle).not.toHaveBeenCalled();
  });

  it('runs a known job under an advisory lock and releases it', async () => {
    const client = mockLock(true);
    const res = await request(app()).post('/api/internal/jobs/subscription-lifecycle').set('Authorization', `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ job: 'subscription-lifecycle', status: 'done', result: { notices: 1, removed: 0 } });
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['SELECT pg_try_advisory_lock($1) AS locked', 'SELECT pg_advisory_unlock($1)']);
    expect(client.release).toHaveBeenCalled();
  });

  it('skips a job that is already running', async () => {
    mockLock(false);
    const res = await request(app()).post('/api/internal/jobs/direct-order-expiry').set('Authorization', `Bearer ${SECRET}`);
    expect(res.status).toBe(409);
  });

  it('404s an unknown job', async () => {
    expect((await request(app()).post('/api/internal/jobs/drop-tables').set('Authorization', `Bearer ${SECRET}`)).status).toBe(404);
  });

  it('reports a failed job without leaking the error', async () => {
    mockLock(true);
    lifecycle.runBusinessSubscriptionLifecycle.mockRejectedValueOnce(new Error('db password is hunter2'));
    const res = await request(app()).post('/api/internal/jobs/subscription-lifecycle').set('Authorization', `Bearer ${SECRET}`);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });
});
