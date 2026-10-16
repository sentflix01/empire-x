'use strict';

/**
 * Public or private business sites, and guests seeing business content only
 * (docs/decisions/platform-model-decisions.md §2 and §7).
 */
const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

let user = null;
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => { if (!user) { res.status(401).json({ error: 'auth' }); return; } req.user = user; next(); },
  optionalAuth: (req, _res, next) => { if (user) req.user = user; next(); },
}));
jest.mock('../../middleware/cache', () => ({ cacheMiddleware: () => (_req, _res, next) => next(), invalidateCache: jest.fn() }));
jest.mock('../../socket', () => ({ emitNotification: jest.fn(), getIO: jest.fn() }));
jest.mock('../../utils/mailer', () => ({ sendCustomEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../lib/businessSubscriptionPolicy', () => ({
  ...jest.requireActual('../../lib/businessSubscriptionPolicy'),
  getBusinessSubscriptionAccess: jest.fn(),
  isBusinessOwnerBlocked: jest.fn().mockResolvedValue(false),
}));

const policy = require('../../lib/businessSubscriptionPolicy');
const { businessViewGate, guestPostSql, announcementLiveSql } = require('../../lib/siteVisibility');

const PUBLIC = { businessId: 'b1', ownerId: 'owner-1', hiddenFromPublic: false, blockedForOwner: false, visibility: 'public' };
const PRIVATE = { ...PUBLIC, visibility: 'private' };
const MEMBER = { id: 'member-1', role: 'user' };

function app(path, router) {
  const a = express();
  a.use(express.json());
  a.use(path, router);
  return a;
}

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockResolvedValue({ rows: [] });
  policy.getBusinessSubscriptionAccess.mockReset();
  user = null;
});

describe('businessViewGate', () => {
  const gate = (access, viewer) => businessViewGate(access, { user: viewer ?? undefined });

  it('lets guests see public businesses and asks them to sign in for private ones', () => {
    expect(gate(PUBLIC)).toBe('ok');
    expect(gate(PRIVATE)).toBe('sign_in');
    expect(gate(PRIVATE, MEMBER)).toBe('ok');
  });

  it('hides lapsed or unknown businesses from everyone but the owner and admins', () => {
    expect(gate({ ...PRIVATE, hiddenFromPublic: true }, MEMBER)).toBe('not_found');
    expect(gate(null, MEMBER)).toBe('not_found');
    expect(gate({ ...PRIVATE, hiddenFromPublic: true }, { id: 'owner-1', role: 'user' })).toBe('ok');
    expect(gate({ ...PRIVATE, hiddenFromPublic: true }, { id: 'x', role: 'admin' })).toBe('ok');
  });

  it('never treats a signed-out viewer as the owner of a business with no known owner', () => {
    expect(gate({ hiddenFromPublic: true })).toBe('not_found');
  });

  it('guest post SQL keeps only announcements of live, non-private sites', () => {
    const sql = guestPostSql('p');
    expect(sql).toMatch(/p\.showroom_id IS NOT NULL/);
    expect(sql).toMatch(/ann_s\.status = 'published'/);
    expect(sql).toMatch(/visibility = 'private'/);
    expect(announcementLiveSql('p')).toMatch(/p\.showroom_id IS NULL OR EXISTS/);
  });
});

describe('business site by link or QR code', () => {
  const showrooms = require('../../routes/showrooms');
  const site = { id: 's1', owner_id: 'owner-1', business_id: 'b1', status: 'published', view_count: 3 };

  it('asks a guest to sign in for a private site and does not count a view', async () => {
    pool.query.mockResolvedValueOnce({ rows: [site] });
    policy.getBusinessSubscriptionAccess.mockResolvedValueOnce(PRIVATE);
    const res = await request(app('/api/showrooms', showrooms)).get('/api/showrooms/slug/abebe');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('SIGN_IN_REQUIRED');
    expect(pool.query.mock.calls.some(([sql]) => /view_count=view_count\+1/.test(sql))).toBe(false);
  });

  it('shows a private site to a signed-in user', async () => {
    user = MEMBER;
    pool.query.mockResolvedValueOnce({ rows: [site] });
    policy.getBusinessSubscriptionAccess.mockResolvedValueOnce(PRIVATE);
    expect((await request(app('/api/showrooms', showrooms)).get('/api/showrooms/slug/abebe')).status).toBe(200);
  });

  it('shows a public site to a guest', async () => {
    pool.query.mockResolvedValueOnce({ rows: [site] });
    policy.getBusinessSubscriptionAccess.mockResolvedValueOnce(PUBLIC);
    expect((await request(app('/api/showrooms', showrooms)).get('/api/showrooms/slug/abebe')).status).toBe(200);
  });

  it('leaves private sites out of the sitemap', async () => {
    await request(app('/api/showrooms', showrooms)).get('/api/showrooms/sitemap-data');
    expect(pool.query.mock.calls[0][0]).toMatch(/visibility = 'private'/);
  });

  it('gives private sites no link preview', async () => {
    const sharePreview = require('../../routes/sharePreview');
    pool.query.mockResolvedValueOnce({ rows: [{ title: 'Private shop', business_id: 'b1' }] });
    policy.getBusinessSubscriptionAccess.mockResolvedValueOnce(PRIVATE);
    expect((await request(app('/api/share-preview', sharePreview)).get('/api/share-preview/showroom/private-shop')).status).toBe(404);
  });
});

describe('owner setting', () => {
  const businesses = require('../../routes/businesses');

  it('rejects an unknown visibility value', async () => {
    user = { id: 'owner-1', role: 'user' };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'b1', owner_id: 'owner-1' }] });
    policy.getBusinessSubscriptionAccess.mockResolvedValueOnce(PUBLIC);
    const res = await request(app('/api/businesses', businesses)).put('/api/businesses/b1').send({ visibility: 'friends' });
    expect(res.status).toBe(422);
  });

  it('hides private businesses from the guest business list', async () => {
    await request(app('/api/businesses', businesses)).get('/api/businesses');
    expect(pool.query.mock.calls[0][0]).toMatch(/businesses\.visibility = 'public'/);
  });

  it('lists private businesses for signed-in users', async () => {
    user = MEMBER;
    await request(app('/api/businesses', businesses)).get('/api/businesses');
    expect(pool.query.mock.calls[0][0]).not.toMatch(/visibility/);
  });
});

describe('guest checkout from a private business', () => {
  const directOrders = require('../../routes/directOrders');
  const ORDER = { product_id: 'p1', quantity: 1, buyer_name: 'Guest', buyer_phone: '+251922222222', buyer_email: 'g@example.test' };

  it('asks a guest to sign in', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'p1', seller_id: 'owner-1', business_id: 'b1', title: 'Coffee', price: '500', stock: 5, status: 'active', currency: 'ETB' }] });
    policy.getBusinessSubscriptionAccess.mockResolvedValueOnce(PRIVATE);
    const res = await request(app('/api/direct-orders', directOrders)).post('/api/direct-orders').send(ORDER);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('SIGN_IN_REQUIRED');
  });
});

describe('personal content needs sign-in', () => {
  it('serves guests only announcement posts of public sites', async () => {
    const posts = require('../../routes/posts');
    await request(app('/api/posts', posts)).get('/api/posts?feed=true');
    expect(pool.query.mock.calls[0][0]).toContain(guestPostSql('p'));
  });

  it('serves signed-in users every post but hides announcements of sites that are no longer live', async () => {
    user = MEMBER;
    const posts = require('../../routes/posts');
    await request(app('/api/posts', posts)).get('/api/posts?feed=true');
    const feedSql = pool.query.mock.calls.find(([sql]) => /FROM posts p WHERE/.test(sql))[0];
    expect(feedSql).toContain(announcementLiveSql('p'));
    expect(feedSql).not.toContain(guestPostSql('p'));
  });

  it('asks a guest to sign in for a personal post', async () => {
    const posts = require('../../routes/posts');
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'post-1', author_id: 'u1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app('/api/posts', posts)).get('/api/posts/post-1');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('SIGN_IN_REQUIRED');
  });

  it('asks a guest to sign in for stories', async () => {
    const stories = require('../../routes/stories');
    const res = await request(app('/api/stories', stories)).get('/api/stories');
    expect(res.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('search gives guests businesses only', async () => {
    const search = require('../../routes/search');
    const res = await request(app('/api/search', search)).get('/api/search?q=coffee');
    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
    expect(res.body.posts).toEqual([]);
    const productSql = pool.query.mock.calls.find(([sql]) => /FROM products p/.test(sql))[0];
    expect(productSql).toMatch(/visibility = 'private'/);
  });
});
