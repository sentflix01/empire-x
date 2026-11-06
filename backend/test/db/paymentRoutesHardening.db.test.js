'use strict';

/**
 * Audit F-018, F-019, F-020 against real Postgres (Redis is off in these tests):
 * - a revoked access token is refused even without Redis (Postgres fallback);
 * - the legacy Chapa status route needs a party to the order, and the public
 *   verify callback never marks an order failed;
 * - the sandbox pages only send people back to our frontend.
 */
process.env.CHAPA_SECRET_KEY = 'CHASECK_TEST-fake-for-tests';
const chapaAnswer = { status: 'failed', data: { status: 'failed' } };
jest.mock('node-fetch', () => ({ __esModule: true, default: jest.fn(async () => ({ json: async () => chapaAnswer })) }));

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');
const { revokeTokenId, revokeAllSessions } = require('../../lib/authSecurityStore');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', require('../../routes/orders'));
  app.use('/api/wallet', require('../../routes/wallet'));
  return app;
}

let app; let seller; let buyer; let stranger; let orderId; const txRef = `ndb-${crypto.randomUUID()}`;
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });

beforeAll(async () => {
  app = buildApp();
  seller = await createUser(); buyer = await createUser(); stranger = await createUser();
  const biz = await createPublicBusiness(seller.id);
  const { rows: [o] } = await pool.query(
    `INSERT INTO orders (buyer_id, seller_id, business_id, product_id, product_title, total_price, status, payment_provider, chapa_tx_ref)
     VALUES ($1, $2, $3, $4, 'Chapa probe', 250, 'pending', 'chapa', $5) RETURNING id`,
    [buyer.id, seller.id, biz.businessId, biz.productId, txRef],
  );
  orderId = o.id;
});

afterAll(async () => {
  await pool.query("DELETE FROM auth_security_state WHERE key LIKE 'revoke%'");
  await pool.query('DELETE FROM orders WHERE seller_id = $1', [seller.id]);
  for (const u of [seller, buyer, stranger]) await deleteUser(u.id);
});

describe('F-018 revoked access tokens without Redis', () => {
  const tokenFor = (u, jti = crypto.randomUUID()) => ({ jti, token: jwt.sign({ sub: u.id, type: 'access', demo: false }, process.env.JWT_SECRET, { expiresIn: '10m', jwtid: jti }) });

  it('refuses a token revoked by id', async () => {
    const { jti, token } = tokenFor(buyer);
    await request(app).get(`/api/orders/chapa/status/${txRef}`).set({ Authorization: `Bearer ${token}` }).expect(200);
    await revokeTokenId(jti, Math.floor(Date.now() / 1000) + 600);
    // The positive answer above may be cached for 10 s in-process; a new token proves the path.
    const fresh = tokenFor(buyer);
    await revokeTokenId(fresh.jti, Math.floor(Date.now() / 1000) + 600);
    await request(app).get(`/api/orders/chapa/status/${txRef}`).set({ Authorization: `Bearer ${fresh.token}` }).expect(401);
  });

  it('refuses tokens issued before a sign-out-everywhere', async () => {
    const old = tokenFor(stranger);
    await new Promise((r) => setTimeout(r, 1100));
    await revokeAllSessions(stranger.id);
    await request(app).get(`/api/orders/chapa/status/${txRef}`).set({ Authorization: `Bearer ${old.token}` }).expect(401);
  });
});

describe('F-019 legacy Chapa routes', () => {
  it('status needs sign-in and shows the status only to the buyer or seller', async () => {
    await request(app).get(`/api/orders/chapa/status/${txRef}`).expect(401);
    const other = await createUser();
    const res = await request(app).get(`/api/orders/chapa/status/${txRef}`).set(auth(other));
    expect(res.body.status).toBeNull();
    await deleteUser(other.id);
    expect((await request(app).get(`/api/orders/chapa/status/${txRef}`).set(auth(seller))).body.status).toBe('pending');
  });

  it('verify does not mark the order failed when Chapa has not confirmed it', async () => {
    const res = await request(app).get(`/api/orders/chapa/verify/${txRef}`);
    expect(res.status).toBe(422);
    const { rows: [o] } = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
    expect(o.status).toBe('pending');
  });

  it('verify rejects malformed references without calling Chapa', async () => {
    const fetch = require('node-fetch').default;
    fetch.mockClear();
    expect((await request(app).get('/api/orders/chapa/verify/abc%27%3Cx')).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('F-020 sandbox pages', () => {
  const prev = process.env.CHAPA_SECRET_KEY;
  beforeAll(() => { process.env.CHAPA_SECRET_KEY = 'SANDBOX'; });
  afterAll(() => { process.env.CHAPA_SECRET_KEY = prev; });

  it('the wallet sandbox page sends people only back to our frontend, as a script string', async () => {
    const evil = encodeURIComponent("javascript:alert(document.domain)//';alert(1);'");
    const res = await request(app).get(`/api/wallet/topup/chapa/sandbox?tx_ref=t1&amount=5&return_url=${evil}&verify_url=${encodeURIComponent('https://evil.test/x')}`);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('javascript:alert');
    expect(res.text).not.toContain('evil.test');
    expect(res.text).toContain('window.location.href="http://localhost:3002"');
  });
});
