describe('Redis CommonJS compatibility exports', () => {
  it('keeps the Redis bypass helpers available to authentication middleware', () => {
    const redis = require('../lib/redis') as {
      withoutRedis: (callback: () => boolean) => boolean;
      isRedisBypassed: () => boolean;
    };

    expect(redis.withoutRedis).toEqual(expect.any(Function));
    expect(redis.isRedisBypassed).toEqual(expect.any(Function));
    expect(redis.withoutRedis(() => redis.isRedisBypassed())).toBe(true);
    expect(redis.isRedisBypassed()).toBe(false);
  });
});

describe('guest feed authentication path', () => {
  const express = require('express') as typeof import('express');
  const request = require('supertest') as (app: import('express').Express) => import('supertest').SuperTest<import('supertest').Test>;
  const pool = require('../db/pool') as { query: jest.Mock };
  const app = express();
  app.use('/api/posts', require('../routes/posts'));

  beforeEach(() => pool.query.mockReset().mockResolvedValue({ rows: [] }));

  it('serves the public feed without an authorization header', async () => {
    const response = await request(app).get('/api/posts');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ posts: [], next_cursor: null });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
