'use strict';

/**
 * Real SQL for the routes guests and members hit most. Every request must
 * answer without a server error, and the visibility rules must hold against
 * real rows.
 */
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  for (const [path, mod] of [
    ['/api/posts', 'posts'], ['/api/products', 'products'], ['/api/showrooms', 'showrooms'],
    ['/api/businesses', 'businesses'], ['/api/search', 'search'], ['/api/maps', 'maps'],
    ['/api/trending', 'trending'], ['/api/profiles', 'profiles'], ['/api/reviews', 'reviews'],
    ['/api/hashtags', 'hashtags'], ['/api/share-preview', 'sharePreview'], ['/api/direct-orders', 'directOrders'],
    ['/api/stories', 'stories'], ['/api/variants', 'variants'],
  ]) app.use(path, require(`../../routes/${mod}`));
  return app;
}

let owner; let member; let pub; let priv; let app;

beforeAll(async () => {
  app = buildApp();
  owner = await createUser();
  member = await createUser();
  pub = await createPublicBusiness(owner.id);
  priv = await createPublicBusiness(owner.id, { visibility: 'private' });
  await pool.query(`INSERT INTO posts (author_id, content, post_type) VALUES ($1, 'db test personal post', 'text')`, [owner.id]);
});

afterAll(async () => {
  await deleteUser(owner.id);
  await deleteUser(member.id);
});

// Paths are templates resolved inside each test, because seeding happens in beforeAll.
const resolve = (path) => path.replace('{product}', pub.productId).replace('{slug}', pub.slug).replace('{business}', pub.businessId);
const guestGets = () => [
  '/api/posts?feed=true&limit=15',
  '/api/posts?limit=10',
  `/api/products?status=active&category=food&search=co&limit=24`,
  `/api/products/{product}`,
  '/api/showrooms?limit=20',
  `/api/showrooms/slug/{slug}`,
  '/api/showrooms/sitemap-data',
  '/api/businesses?limit=20',
  `/api/businesses/{business}`,
  `/api/businesses/{business}/checkout-info`,
  '/api/search?q=co',
  '/api/search?q=coffee',
  '/api/search?q=coffee&type=products&price_min=1&price_max=1000',
  '/api/maps/nearby?lat=9&lon=38.7',
  '/api/maps/nearby/product-search?lat=9&lon=38.7&q=coffee',
  '/api/trending',
  '/api/profiles?limit=5',
  `/api/reviews?product_id={product}`,
  `/api/reviews/product/{product}`,
  '/api/hashtags/coffee/posts',
  `/api/share-preview/showroom/{slug}`,
  `/api/share-preview/product/{product}`,
  `/api/direct-orders/checkout-info?product_id={product}`,
  `/api/variants/product/{product}`,
];

describe('guest reads run real SQL without server errors', () => {
  it.each(guestGets().map((p) => [p]))('GET %s', async (path) => {
    const res = await request(app).get(resolve(path));
    expect(res.status).toBeLessThan(500);
  });
});

describe('member reads run real SQL without server errors', () => {
  it.each(guestGets().concat(['/api/stories', '/api/posts?following=true&limit=10']).map((p) => [p]))('GET %s', async (path) => {
    const res = await request(app).get(resolve(path)).set('Authorization', `Bearer ${accessToken(member.id)}`);
    expect(res.status).toBeLessThan(500);
  });
});

describe('visibility against real rows', () => {
  it('guests get 401 for a private business site and product, members get 200', async () => {
    const site = (await pool.query('SELECT slug FROM showrooms WHERE id = $1', [priv.siteId])).rows[0].slug;
    expect((await request(app).get(`/api/showrooms/slug/${site}`)).status).toBe(401);
    expect((await request(app).get(`/api/products/${priv.productId}`)).status).toBe(401);
    const auth = { Authorization: `Bearer ${accessToken(member.id)}` };
    expect((await request(app).get(`/api/showrooms/slug/${site}`).set(auth)).status).toBe(200);
    expect((await request(app).get(`/api/products/${priv.productId}`).set(auth)).status).toBe(200);
  });

  it('guest lists include the public business and leave the private one out', async () => {
    const products = (await request(app).get('/api/products?status=active&limit=100')).body.products.map((p) => p.id);
    expect(products).toContain(pub.productId);
    expect(products).not.toContain(priv.productId);
    const businesses = (await request(app).get('/api/businesses?limit=100')).body.map((b) => b.id);
    expect(businesses).toContain(pub.businessId);
    expect(businesses).not.toContain(priv.businessId);
  });

  it('guests never see personal posts; members do', async () => {
    const guestFeed = (await request(app).get('/api/posts?feed=true&limit=50')).body.posts;
    expect(guestFeed.every((p) => p.showroom_id)).toBe(true);
    const memberFeed = (await request(app).get('/api/posts?feed=true&limit=50').set('Authorization', `Bearer ${accessToken(member.id)}`)).body.posts;
    expect(memberFeed.some((p) => p.content === 'db test personal post')).toBe(true);
  });
});
