'use strict';

/**
 * Business reviews from verified customers (decision "Business reviews:
 * verified customers only"). Real Postgres.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/businesses/:businessId/reviews', require('../../routes/businessReviews'));
  app.use('/api/moderation', require('../../routes/moderation'));
  app.use('/api/feed', require('../../routes/feed'));
  return app;
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });

let app; let owner; let buyer; let other; let admin; let bizId;

async function completedOrder(buyerId, sellerId, businessId) {
  await pool.query(
    `INSERT INTO orders (buyer_id, seller_id, business_id, product_title, quantity, unit_price, total_price, currency, status, payment_provider)
     VALUES ($1, $2, $3, 'Room night', 1, 100, 100, 'ETB', 'completed', 'direct')`,
    [buyerId, sellerId, businessId],
  );
}

beforeAll(async () => {
  app = buildApp();
  [owner, buyer, other, admin] = await Promise.all([createUser(), createUser(), createUser(), createUser()]);
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
  ({ businessId: bizId } = await createPublicBusiness(owner.id));
});

afterAll(async () => {
  await pool.query('DELETE FROM orders WHERE seller_id = $1', [owner.id]);
  for (const u of [owner, buyer, other, admin]) await deleteUser(u.id);
});

const post = (user, body) => request(app).post(`/api/businesses/${bizId}/reviews`).set(auth(user)).send(body);

describe('business reviews', () => {
  it('refuses a review without a completed order', async () => {
    const res = await post(buyer, { rating: 5 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NO_COMPLETED_ORDER');
    const mine = await request(app).get(`/api/businesses/${bizId}/reviews/mine`).set(auth(buyer));
    expect(mine.body).toMatchObject({ can_review: false, reason: 'no_completed_order' });
  });

  it('refuses the owner', async () => {
    const res = await post(owner, { rating: 5 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OWN_BUSINESS');
  });

  it('validates the rating and comment', async () => {
    await completedOrder(buyer.id, owner.id, bizId);
    expect((await post(buyer, { rating: 6 })).status).toBe(422);
    expect((await post(buyer, { rating: 4.5 })).status).toBe(422);
    expect((await post(buyer, { rating: 4, comment: 'x'.repeat(1001) })).status).toBe(422);
  });

  it('accepts a verified customer once, and a second send edits it', async () => {
    const mine = await request(app).get(`/api/businesses/${bizId}/reviews/mine`).set(auth(buyer));
    expect(mine.body.can_review).toBe(true);
    const first = await post(buyer, { rating: 4, comment: 'Clean rooms and kind staff.' });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ average_rating: 4, review_count: 1 });
    const edit = await post(buyer, { rating: 5 });
    expect(edit.status).toBe(200);
    expect(edit.body).toMatchObject({ average_rating: 5, review_count: 1 });
  });

  it('averages several customers and lists visible reviews with names', async () => {
    await completedOrder(other.id, owner.id, bizId);
    await post(other, { rating: 3 });
    const list = await request(app).get(`/api/businesses/${bizId}/reviews`);
    expect(list.status).toBe(200);
    expect(list.body.review_count).toBe(2);
    expect(list.body.average_rating).toBe(4);
    expect(list.body.reviews[0]).toHaveProperty('reviewer_name');
  });

  it('can be reported, and hiding it updates the average', async () => {
    const list = await request(app).get(`/api/businesses/${bizId}/reviews`);
    const low = list.body.reviews.find((r) => r.rating === 3);
    const report = await request(app).post('/api/moderation/report').set(auth(buyer)).send({ target_id: low.id, target_type: 'business_review', reason: 'spam' });
    expect(report.status).toBe(201);
    expect((await request(app).put(`/api/businesses/${bizId}/reviews/${low.id}/status`).set(auth(buyer)).send({ status: 'hidden' })).status).toBe(403);
    const hide = await request(app).put(`/api/businesses/${bizId}/reviews/${low.id}/status`).set(auth(admin)).send({ status: 'hidden' });
    expect(hide.status).toBe(200);
    expect(hide.body).toMatchObject({ average_rating: 5, review_count: 1 });
    const after = await request(app).get(`/api/businesses/${bizId}/reviews`);
    expect(after.body.reviews.map((r) => r.id)).not.toContain(low.id);
  });

  it('shows the rating on the Business feed', async () => {
    let offset = 0; let found = null;
    for (let i = 0; i < 30 && offset !== null && !found; i++) {
      const res = await request(app).get('/api/feed/businesses').query({ sort: 'recent', limit: 30, offset });
      found = res.body.items.find((it) => (it.type === 'business' ? it.record.id : it.record.business_id) === bizId);
      offset = res.body.next_offset;
    }
    expect(found).toBeTruthy();
    expect(found).toMatchObject({ rating_avg: 5, rating_count: 1 });
  });

  it('lets the reviewer delete their review', async () => {
    const mine = await request(app).get(`/api/businesses/${bizId}/reviews/mine`).set(auth(buyer));
    const res = await request(app).delete(`/api/businesses/${bizId}/reviews/${mine.body.review.id}`).set(auth(buyer));
    expect(res.status).toBe(200);
    expect(res.body.review_count).toBe(0);
  });
});
