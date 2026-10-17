'use strict';

/**
 * USD plans through Stripe in test mode, against real Postgres, with a fake
 * Stripe that answers in the current API shape (period dates on the
 * subscription item, invoice subscription under parent.subscription_details):
 * checkout without price IDs, activation, renewal via invoice.paid.
 */
process.env.FF_STRIPE_PAYMENTS = 'true';
process.env.FRONTEND_URL = 'http://frontend.test';
delete process.env.STRIPE_PRICE_PREMIUM_MONTHLY_USD;

const fake = {
  sessions: [],
  period: { start: 1_790_000_000, end: 1_792_592_000 },
};
jest.mock('../../lib/stripeClient', () => ({
  isStripeConfigured: () => true,
  isStripeTestMode: () => true,
  stripeClientFacade: () => ({
    checkout: { sessions: { create: async (args) => { fake.sessions.push(args); return { id: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' }; } } },
    subscriptions: { retrieve: async (id) => ({ id, items: { data: [{ current_period_start: fake.period.start, current_period_end: fake.period.end }] } }) },
    prices: { retrieve: async () => { throw new Error('no price IDs configured'); } },
  }),
  withVerifiedStripeWebhook: async (body, _sig, _secrets, handler) => handler(JSON.parse(Buffer.from(body).toString('utf8'))),
}));

const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser, tag } = require('./helpers');

function buildApp() {
  const app = express();
  app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use('/api/subscriptions', require('../../routes/subscriptions'));
  return app;
}

let app; let owner; let businessId;
const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const sub = async () => (await pool.query('SELECT tier, status, currency, current_period_start, current_period_end FROM business_subscriptions WHERE business_id = $1', [businessId])).rows[0];
const webhook = (event) => request(app).post('/api/subscriptions/webhook').set('Content-Type', 'application/json').set('stripe-signature', 't=1,v1=x').send(JSON.stringify(event));

beforeAll(async () => {
  app = buildApp();
  owner = await createUser();
  const { rows: [biz] } = await pool.query(
    `INSERT INTO businesses (owner_id, business_name, business_category) VALUES ($1, $2, 'shop') RETURNING id`,
    [owner.id, `Stripe Probe ${tag()}`],
  );
  businessId = biz.id;
});

afterAll(async () => { await deleteUser(owner.id); });

describe('Stripe USD plans in test mode', () => {
  it('lists USD as available without any price IDs, in test mode', async () => {
    const res = await request(app).get('/api/subscriptions/plans');
    expect(res.status).toBe(200);
    expect(res.body.premium_monthly.currencyAvailability.USD).toBe(true);
    expect(res.body.premium_monthly.providers.USD).toBe('stripe');
    expect(res.body.premium_monthly.testMode.USD).toBe(true);
  });

  it('opens checkout with the published price when no price ID is set', async () => {
    const res = await request(app).post('/api/subscriptions/create').set(auth(owner))
      .send({ plan: 'premium_monthly', currency: 'USD', business_id: businessId });
    expect(res.status).toBe(200);
    expect(res.body.checkout_url).toContain('checkout.stripe.test');
    const [args] = fake.sessions;
    expect(args.mode).toBe('subscription');
    expect(args.line_items).toEqual([{ quantity: 1, price_data: expect.objectContaining({ currency: 'usd', unit_amount: 500, recurring: { interval: 'month', interval_count: 1 } }) }]);
    expect(args.metadata).toMatchObject({ business_id: businessId, tier: 'premium', currency: 'USD' });
  });

  it('still refuses Stripe ETB without a price ID (ETB is prepaid through Chapa)', async () => {
    const res = await request(app).post('/api/subscriptions/create').set(auth(owner))
      .send({ plan: 'premium_monthly', currency: 'ETB', business_id: businessId });
    expect(res.status).toBe(503);
  });

  it('activates on checkout.session.completed with dates from the subscription item', async () => {
    const res = await webhook({ id: `evt_${tag()}`, type: 'checkout.session.completed', data: { object: {
      subscription: 'sub_test_1', customer: 'cus_test_1',
      metadata: { business_id: businessId, tier: 'premium', currency: 'USD', plan_key: 'premium_monthly', user_id: owner.id },
    } } });
    expect(res.status).toBe(200);
    const row = await sub();
    expect(row).toMatchObject({ tier: 'premium', status: 'active', currency: 'USD' });
    expect(new Date(row.current_period_end).getTime()).toBe(fake.period.end * 1000);
  });

  it('extends the period on invoice.paid (new invoice shape)', async () => {
    const nextEnd = fake.period.end + 30 * 86400;
    const res = await webhook({ id: `evt_${tag()}`, type: 'invoice.paid', data: { object: {
      customer: 'cus_test_1',
      parent: { subscription_details: { subscription: 'sub_test_1' } },
      lines: { data: [{ period: { start: fake.period.end, end: nextEnd } }] },
    } } });
    expect(res.status).toBe(200);
    const row = await sub();
    expect(row.status).toBe('active');
    expect(new Date(row.current_period_end).getTime()).toBe(nextEnd * 1000);
  });

  it('never moves the period back on an older invoice', async () => {
    const before = (await sub()).current_period_end;
    await webhook({ id: `evt_${tag()}`, type: 'invoice.paid', data: { object: {
      subscription: 'sub_test_1',
      lines: { data: [{ period: { start: fake.period.start, end: fake.period.end } }] },
    } } });
    expect((await sub()).current_period_end).toEqual(before);
  });

  it('processes each Stripe event once', async () => {
    const event = { id: `evt_dup_${tag()}`, type: 'customer.subscription.updated', data: { object: { id: 'sub_test_1', status: 'active' } } };
    expect((await webhook(event)).body).toEqual({ received: true });
    expect((await webhook(event)).body).toEqual({ received: true, duplicate: true });
  });

  it('keeps going on customer.subscription.updated without top-level period fields', async () => {
    const res = await webhook({ id: `evt_${tag()}`, type: 'customer.subscription.updated', data: { object: {
      id: 'sub_test_1', status: 'active', cancel_at_period_end: true, items: { data: [{}] },
    } } });
    expect(res.status).toBe(200);
    expect((await sub()).status).toBe('active');
  });
});
