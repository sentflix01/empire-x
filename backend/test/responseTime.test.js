const express = require('express');
const request = require('supertest');
const responseTime = require('../middleware/responseTime');

describe('responseTime middleware', () => {
  it('sets a response-time header without attempting to mutate sent headers', async () => {
    const app = express();
    app.use(responseTime);
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));

    const response = await request(app).get('/health').expect(200);

    expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
  });
});
