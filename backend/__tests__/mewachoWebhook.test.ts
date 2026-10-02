jest.mock('../db/pool', () => require('../test/helpers/mockPool'));

const express = require('express');
const request = require('supertest');
const pool = require('../db/pool');
const webhookModule = require('../lib/stripeClient');
const router = require('../routes/mewacho');

describe('Mewacho Stripe webhook idempotency', () => {
  const event = {
    id: 'evt_mewacho_replay',
    type: 'checkout.session.completed',
    data: { object: { metadata: {
      mewacho_contrib_id: 'contribution-1',
      mewacho_group_id: 'group-1',
      user_id: 'user-1',
      amount_etb: '250',
    } } },
  };
  let contributionConfirmed: boolean;
  let activityInsertCount: number;
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    contributionConfirmed = false;
    activityInsertCount = 0;
    jest.spyOn(webhookModule, 'withVerifiedStripeWebhook').mockImplementation(async (_body, _signature, _secrets, handler) =>
      handler(event, 'real') as never,
    );

    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes("SET status='confirmed'")) {
          if (contributionConfirmed) return { rows: [] };
          contributionConfirmed = true;
          return { rows: [{ id: 'contribution-1' }] };
        }
        if (sql.includes('SELECT is_anonymous')) return { rows: [{ is_anonymous: false }] };
        if (sql.includes('SELECT COALESCE(NULLIF(full_name')) return { rows: [{ name: 'Demo Member' }] };
        if (sql.includes('INSERT INTO mewacho_activity')) {
          activityInsertCount += 1;
          return { rows: [{ id: `activity-${activityInsertCount}` }] };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);
    pool.query.mockResolvedValue({ rows: [] });

    app = express();
    app.use('/api/mewacho/webhook', express.raw({ type: 'application/json' }));
    app.use('/api/mewacho', router);
  });

  afterEach(() => jest.restoreAllMocks());

  test('a replayed contribution confirmation changes state and writes activity once', async () => {
    const send = () => request(app)
      .post('/api/mewacho/webhook')
      .set('stripe-signature', 'test-signature')
      .send('{}');

    const first = await send();
    const replay = await send();

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(activityInsertCount).toBe(1);
  });

  test('database failure is surfaced so Stripe retries the event', async () => {
    pool.connect.mockResolvedValueOnce({
      query: jest.fn(async (sql: string) => {
        if (sql === 'BEGIN') return { rows: [] };
        if (sql.includes("SET status='confirmed'")) return { rows: [{ id: 'contribution-1' }] };
        if (sql.includes('SELECT COALESCE(NULLIF(full_name')) throw new Error('database unavailable');
        return { rows: [] };
      }),
      release: jest.fn(),
    });

    const response = await request(app)
      .post('/api/mewacho/webhook')
      .set('stripe-signature', 'test-signature')
      .send('{}');

    expect(response.status).toBe(500);
  });
});
