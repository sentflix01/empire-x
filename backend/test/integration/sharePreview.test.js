'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../lib/businessSubscriptionPolicy', () => ({ getBusinessSubscriptionAccess: jest.fn() }));
const policy = require('../../lib/businessSubscriptionPolicy');
const sharePreview = require('../../routes/sharePreview');

function buildApp() {
  const app = express();
  app.use((req, _res, next) => { req.realOnly = true; next(); });
  app.use('/api/share-preview', sharePreview);
  return app;
}

beforeEach(() => { pool.query.mockReset(); policy.getBusinessSubscriptionAccess.mockReset(); });

describe('share previews', () => {
  it('returns only public showroom fields and never counts a view', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ title: 'Abebe Coffee', description: 'Fresh   beans\n daily', cover_image: 'https://cdn.example/c.jpg', logo_url: null, business_id: 'b1' }] });
    policy.getBusinessSubscriptionAccess.mockResolvedValueOnce({ hiddenFromPublic: false });
    const res = await request(buildApp()).get('/api/share-preview/showroom/abebe-coffee');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ title: 'Abebe Coffee', description: 'Fresh beans daily', image: 'https://cdn.example/c.jpg' });
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toMatch(/status='published'/);
    expect(pool.query.mock.calls[0][0]).toMatch(/is_seed=FALSE AND is_demo=FALSE/);
    expect(pool.query.mock.calls[0][0]).not.toMatch(/view_count/);
  });

  it('hides a business whose subscription lapsed', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ title: 'Lapsed', business_id: 'b1' }] });
    policy.getBusinessSubscriptionAccess.mockResolvedValueOnce({ hiddenFromPublic: true });
    expect((await request(buildApp()).get('/api/share-preview/showroom/lapsed')).status).toBe(404);
  });

  it('returns product price and first image', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ title: 'Beans 1kg', description: null, images: '["https://cdn.example/1.jpg","https://cdn.example/2.jpg"]', price: '450.00', currency: 'ETB', business_id: null }] });
    const res = await request(buildApp()).get('/api/share-preview/product/p1');
    expect(res.body).toEqual({ title: 'Beans 1kg', description: null, image: 'https://cdn.example/1.jpg', price: 450, currency: 'ETB' });
    expect(pool.query.mock.calls[0][0]).toMatch(/p.status IN \('active','sold_out'\)/);
  });

  it('404s an unknown product', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect((await request(buildApp()).get('/api/share-preview/product/nope')).status).toBe(404);
  });
});
