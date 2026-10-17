'use strict';

/**
 * Prepaid ETB subscriptions through Chapa, end to end against real Postgres,
 * with Chapa in sandbox mode: checkout, pay, confirm (webhook, callback and
 * return page), renewals, upgrades, duplicates, wrong amounts, drafts.
 */
process.env.CHAPA_SECRET_KEY = 'SANDBOX';
process.env.CHAPA_WEBHOOK_SECRET = 'db-test-chapa-webhook-secret';
process.env.FRONTEND_URL = 'http://frontend.test';
process.env.API_URL = 'http://api.test';

const crypto = require('crypto');
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser, tag } = require('./helpers');
const { sandboxConfirm } = require('../../lib/chapaClient');

function buildApp() {
  const app = express();
  app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use('/api/subscriptions', require('../../routes/subscriptionsEtb'));
  return app;
}

let app; let owner; let stranger; let businessId;
const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const sub = async () => (await pool.query('SELECT tier, status, billing_provider, current_period_end FROM business_subscriptions WHERE business_id = $1', [businessId])).rows[0];
const sign = (body) => crypto.createHmac('sha256', process.env.CHAPA_WEBHOOK_SECRET).update(body).digest('hex');

async function checkout(body) {
  const res = await request(app).post('/api/subscriptions/checkout').set(auth(owner)).send({ business_id: businessId, ...body });
  expect(res.status).toBe(200);
  expect(res.body.checkout_url).toContain('/api/subscriptions/chapa/sandbox?tx_ref=');
  return res.body;
}

async function payInSandbox(txRef) {
  const res = await request(app).post('/api/subscriptions/chapa/sandbox/pay').type('form')
    .send({ tx_ref: txRef, return_url: `http://frontend.test/business/subscription/return?tx_ref=${txRef}` });
  expect(res.status).toBe(303);
  expect(res.headers.location).toBe(`http://frontend.test/business/subscription/return?tx_ref=${txRef}`);
}

const status = (txRef, user = owner) => request(app).get(`/api/subscriptions/payments/${txRef}/status`).set(auth(user));

beforeAll(async () => {
  app = buildApp();
  owner = await createUser();
  stranger = await createUser();
  const { rows: [biz] } = await pool.query(
    `INSERT INTO businesses (owner_id, business_name, business_category) VALUES ($1, $2, 'shop') RETURNING id`,
    [owner.id, `Chapa Probe ${tag()}`],
  );
  businessId = biz.id;
});

afterAll(async () => {
  await deleteUser(owner.id);
  await deleteUser(stranger.id);
});

describe('first payment', () => {
  let first;

  it('quotes and starts a Chapa checkout for Normal, 1 month', async () => {
    const quote = await request(app).get(`/api/subscriptions/quote?businessId=${businessId}&plan=normal&months=1`).set(auth(owner));
    expect(quote.status).toBe(200);
    expect(quote.body).toMatchObject({ kind: 'new', tier: 'normal', amount: 100, currency: 'ETB' });
    first = await checkout({ plan: 'normal', months: 1 });
    expect(first).toMatchObject({ amount: 100, currency: 'ETB', kind: 'new' });
  });

  it('stays pending until Chapa confirms it', async () => {
    const res = await status(first.tx_ref);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(await sub()).toBeUndefined();
  });

  it('activates the plan once paid, with a receipt and a notice', async () => {
    await payInSandbox(first.tx_ref);
    const res = await status(first.tx_ref);
    expect(res.body).toMatchObject({ status: 'paid', tier: 'normal' });
    expect(res.body.receipt_number).toMatch(/^NB-\d{4}-\d{6}$/);
    const s = await sub();
    expect(s).toMatchObject({ tier: 'normal', status: 'active', billing_provider: 'chapa' });
    const days = (new Date(s.current_period_end).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(27);
    expect(days).toBeLessThan(32);
    const notices = await pool.query("SELECT 1 FROM notifications WHERE user_id = $1 AND title = 'Payment received'", [owner.id]);
    expect(notices.rowCount).toBe(1);
  });

  it('applies the payment only once, whatever confirms it', async () => {
    const before = (await sub()).current_period_end;
    const body = JSON.stringify({ tx_ref: first.tx_ref, status: 'success' });
    const hook = await request(app).post('/api/subscriptions/webhook/chapa')
      .set('Content-Type', 'application/json').set('x-chapa-signature', sign(body)).send(body);
    expect(hook.status).toBe(200);
    expect(hook.body.outcome).toBe('already_paid');
    expect((await request(app).get(`/api/subscriptions/chapa/callback?trx_ref=${first.tx_ref}`)).body.outcome).toBe('already_paid');
    expect((await sub()).current_period_end).toEqual(before);
    const paid = await pool.query("SELECT COUNT(*)::int n FROM subscription_payments WHERE provider_ref = $1 AND status = 'paid'", [first.tx_ref]);
    expect(paid.rows[0].n).toBe(1);
  });

  it('rejects an unsigned or wrongly signed webhook', async () => {
    const body = JSON.stringify({ tx_ref: first.tx_ref });
    expect((await request(app).post('/api/subscriptions/webhook/chapa').set('Content-Type', 'application/json').send(body)).status).toBe(401);
    expect((await request(app).post('/api/subscriptions/webhook/chapa').set('Content-Type', 'application/json')
      .set('x-chapa-signature', sign('{"tx_ref":"other"}')).send(body)).status).toBe(401);
  });

  it('serves the receipt only to the owner', async () => {
    const paymentId = (await status(first.tx_ref)).body.payment_id;
    const mine = await request(app).get(`/api/subscriptions/payments/${paymentId}/receipt`).set(auth(owner));
    expect(mine.status).toBe(200);
    expect(mine.body).toMatchObject({ plan: 'Normal', amount: '100.00', currency: 'ETB', provider: 'chapa' });
    expect((await request(app).get(`/api/subscriptions/payments/${paymentId}/receipt`).set(auth(stranger))).status).toBe(404);
    expect((await status(first.tx_ref, stranger)).status).toBe(404);
  });
});

describe('renewal and upgrade', () => {
  it('extends a renewal from the current end date', async () => {
    const before = new Date((await sub()).current_period_end);
    const renewal = await checkout({ plan: 'normal', months: 3 });
    expect(renewal).toMatchObject({ kind: 'renewal', amount: 300 });
    await payInSandbox(renewal.tx_ref);
    expect((await status(renewal.tx_ref)).body.status).toBe('paid');
    const after = new Date((await sub()).current_period_end);
    const expected = new Date(before); expected.setUTCMonth(expected.getUTCMonth() + 3);
    expect(Math.abs(after.getTime() - expected.getTime())).toBeLessThan(3 * 86_400_000);
  });

  it('upgrades for the prorated difference and keeps the end date', async () => {
    const before = (await sub()).current_period_end;
    const upgrade = await checkout({ plan: 'pro', months: 0 });
    expect(upgrade.kind).toBe('upgrade');
    expect(upgrade.amount).toBeGreaterThan(900 * 3); // about four months left at 900/month difference
    await payInSandbox(upgrade.tx_ref);
    expect((await status(upgrade.tx_ref)).body.status).toBe('paid');
    const s = await sub();
    expect(s.tier).toBe('pro');
    expect(s.current_period_end).toEqual(before);
  });

  it('refuses a downgrade during a paid period', async () => {
    const res = await request(app).post('/api/subscriptions/checkout').set(auth(owner)).send({ business_id: businessId, plan: 'normal', months: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('downgrade_not_allowed');
  });
});

describe('safety', () => {
  it('does not apply a payment that Chapa reports for less than the quote', async () => {
    const before = await sub();
    const renewal = await checkout({ plan: 'pro', months: 1 });
    sandboxConfirm(renewal.tx_ref, renewal.amount - 1);
    const res = await status(renewal.tx_ref);
    expect(res.body.status).toBe('failed');
    expect(await sub()).toEqual(before);
  });

  it('will not start a checkout for someone else\'s business', async () => {
    const res = await request(app).post('/api/subscriptions/checkout').set(auth(stranger)).send({ business_id: businessId, plan: 'normal', months: 1 });
    expect(res.status).toBe(404);
  });
});

describe('paying to publish a saved draft', () => {
  it('publishes the draft once the plan is paid', async () => {
    const draftOwner = await createUser();
    try {
      const { rows: [biz] } = await pool.query(
        `INSERT INTO businesses (owner_id, business_name, business_category) VALUES ($1, 'Draft Probe', 'shop') RETURNING id`, [draftOwner.id],
      );
      const { rows: [draft] } = await pool.query(
        `INSERT INTO showrooms (owner_id, business_id, title, category, sections, status, slug, expires_at)
         VALUES ($1, $2, 'Draft Probe', 'Business & Commerce', '[{"type":"hero"}]', 'draft', $3, NOW() + INTERVAL '3 days') RETURNING id`,
        [draftOwner.id, biz.id, `draft-probe-${tag()}`],
      );
      const start = await request(app).post('/api/subscriptions/checkout').set(auth(draftOwner))
        .send({ business_id: biz.id, plan: 'normal', months: 1, draft_id: draft.id });
      expect(start.status).toBe(200);
      await payInSandbox(start.body.tx_ref);
      const res = await request(app).get(`/api/subscriptions/payments/${start.body.tx_ref}/status`).set(auth(draftOwner));
      expect(res.body.status).toBe('paid');
      const site = (await pool.query('SELECT status, expires_at FROM showrooms WHERE id = $1', [draft.id])).rows[0];
      expect(site).toMatchObject({ status: 'published', expires_at: null });
    } finally {
      await deleteUser(draftOwner.id);
    }
  });
});
