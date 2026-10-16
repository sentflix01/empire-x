import express from 'express';
import request from 'supertest';
import pool from '../db/pool';

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

const mockStripe = { subscriptions: { retrieve: jest.fn() } };
const mockEvent: { current: StripeEvent | null } = { current: null };

jest.mock('../lib/stripeClient', () => ({
  isStripeConfigured: () => true,
  stripeClientFacade: () => mockStripe,
  withVerifiedStripeWebhook: async (
    _body: Buffer,
    _signature: string,
    _secrets: unknown,
    handler: (event: unknown, environment: string) => Promise<unknown>,
  ) => handler(mockEvent.current, 'real'),
}));
jest.mock('../middleware/tierLimit', () => ({ invalidateSubCache: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const subscriptionsRouter = require('../routes/subscriptions');
const { subscriptionPeriod } = subscriptionsRouter as {
  subscriptionPeriod: (sub: unknown) => { start: Date | null; end: Date | null };
};

const mockPool = pool as unknown as { query: jest.Mock };
const app = express();
app.use('/api/subscriptions/webhook', express.raw({ type: '*/*' }));
app.use('/api/subscriptions', subscriptionsRouter);

const ts = (iso: string) => Date.parse(iso) / 1000;

/** pool.query routed by SQL: the claim succeeds, subscription lookups find biz-1. */
function routePoolQueries({ claim = true } = {}) {
  mockPool.query.mockImplementation(async (sql: string) => {
    if (sql.includes('INSERT INTO webhook_events')) return { rows: claim ? [{ id: mockEvent.current!.id }] : [] };
    if (sql.includes('SELECT business_id FROM business_subscriptions')) return { rows: [{ business_id: 'biz-1' }] };
    return { rows: [] };
  });
}

function callsMatching(fragment: string) {
  return mockPool.query.mock.calls.filter(([sql]) => String(sql).includes(fragment));
}

function postEvent(event: StripeEvent) {
  mockEvent.current = event;
  return request(app)
    .post('/api/subscriptions/webhook')
    .set('stripe-signature', 'sig')
    .set('content-type', 'application/json')
    .send(JSON.stringify(event));
}

describe('subscription webhook idempotency claim (F-C1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routePoolQueries();
  });

  it('claims the event using the webhook_events id/type columns', async () => {
    const response = await postEvent({ id: 'evt_1', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    const [claim] = callsMatching('INSERT INTO webhook_events');
    expect(claim[0]).toBe('INSERT INTO webhook_events (id,type) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING RETURNING id');
    expect(claim[1]).toEqual(['evt_1', 'customer.subscription.deleted']);
    expect(callsMatching('event_id')).toHaveLength(0);
  });

  it('acknowledges a duplicate delivery without processing it', async () => {
    routePoolQueries({ claim: false });
    const response = await postEvent({ id: 'evt_dup', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });

    expect(response.body).toEqual({ received: true, duplicate: true });
    expect(callsMatching('business_subscriptions')).toHaveLength(0);
  });

  it('releases the claim by id when processing fails so Stripe can redeliver', async () => {
    mockPool.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO webhook_events')) return { rows: [{ id: 'evt_fail' }] };
      if (sql.includes('business_subscriptions')) throw new Error('db down');
      return { rows: [] };
    });
    const response = await postEvent({ id: 'evt_fail', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });

    expect(response.status).toBe(500);
    const [release] = callsMatching('DELETE FROM webhook_events');
    expect(release).toEqual(['DELETE FROM webhook_events WHERE id=$1', ['evt_fail']]);
  });
});

describe('subscription billing periods (F-C2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routePoolQueries();
  });

  it('reads the period from subscription items, using the latest item end', () => {
    const period = subscriptionPeriod({
      items: {
        data: [
          { current_period_start: ts('2026-10-01T00:00:00Z'), current_period_end: ts('2026-11-01T00:00:00Z') },
          { current_period_start: ts('2026-10-15T00:00:00Z'), current_period_end: ts('2026-11-15T00:00:00Z') },
        ],
      },
    });
    expect(period.start?.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(period.end?.toISOString()).toBe('2026-11-15T00:00:00.000Z');
  });

  it('returns nulls instead of an Invalid Date when Stripe sends no period', () => {
    expect(subscriptionPeriod({ items: { data: [{}] } })).toEqual({ start: null, end: null });
    expect(subscriptionPeriod({})).toEqual({ start: null, end: null });
    expect(subscriptionPeriod(null)).toEqual({ start: null, end: null });
  });

  it('falls back to legacy subscription-level fields', () => {
    const period = subscriptionPeriod({ current_period_start: ts('2026-10-01T00:00:00Z'), current_period_end: ts('2026-11-01T00:00:00Z') });
    expect(period.end?.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('checkout.session.completed stores the item period from the retrieved subscription', async () => {
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      items: { data: [{ current_period_start: ts('2026-10-15T00:00:00Z'), current_period_end: ts('2026-11-15T00:00:00Z') }] },
    });
    const response = await postEvent({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      data: { object: { subscription: 'sub_1', customer: 'cus_1', metadata: { business_id: 'biz-1', tier: 'premium' } } },
    });

    expect(response.status).toBe(200);
    expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_1');
    const [insert] = callsMatching('INSERT INTO business_subscriptions');
    const [, , , , , start, end] = insert[1] as [string, string, string, string, string, Date, Date];
    expect(start.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-15T00:00:00.000Z');
  });

  it('checkout.session.completed never writes an Invalid Date when the period is missing', async () => {
    mockStripe.subscriptions.retrieve.mockResolvedValue({ id: 'sub_1', status: 'active', items: { data: [] } });
    await postEvent({
      id: 'evt_checkout_2',
      type: 'checkout.session.completed',
      data: { object: { subscription: 'sub_1', customer: 'cus_1', metadata: { business_id: 'biz-1', tier: 'premium' } } },
    });

    const [insert] = callsMatching('INSERT INTO business_subscriptions');
    expect((insert[1] as unknown[]).slice(5)).toEqual([null, null]);
  });

  it('customer.subscription.updated extends the period from items and never moves it back', async () => {
    await postEvent({
      id: 'evt_updated',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          cancel_at_period_end: false,
          items: { data: [{ current_period_start: ts('2026-11-15T00:00:00Z'), current_period_end: ts('2026-12-15T00:00:00Z') }] },
        },
      },
    });

    const [update] = callsMatching('UPDATE business_subscriptions SET');
    expect(update[0]).toContain('current_period_end   = GREATEST(current_period_end, $4)');
    const [status, cancel, start, end, subId] = update[1] as [string, boolean, Date, Date, string];
    expect([status, cancel, subId]).toEqual(['active', false, 'sub_1']);
    expect(start.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-15T00:00:00.000Z');
  });

  it('invoice.paid re-reads the subscription and extends current_period_end', async () => {
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      items: { data: [{ current_period_start: ts('2026-11-15T00:00:00Z'), current_period_end: ts('2026-12-15T00:00:00Z') }] },
    });
    const response = await postEvent({
      id: 'evt_invoice_paid',
      type: 'invoice.paid',
      data: { object: { id: 'in_1', customer: 'cus_1', parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1' } } } },
    });

    expect(response.status).toBe(200);
    expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_1');
    const [lookup] = callsMatching('SELECT business_id FROM business_subscriptions');
    expect(lookup[1]).toEqual(['sub_1']);
    const [update] = callsMatching('UPDATE business_subscriptions SET');
    expect(update[0]).toContain('current_period_end   = GREATEST(current_period_end, $3)');
    const [status, start, end, subId] = update[1] as [string, Date, Date, string];
    expect(status).toBe('active');
    expect(start.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-15T00:00:00.000Z');
    expect(subId).toBe('sub_1');
  });

  it('invoice.paid ignores invoices that do not belong to a subscription', async () => {
    await postEvent({ id: 'evt_invoice_other', type: 'invoice.paid', data: { object: { id: 'in_2', parent: null } } });

    expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(callsMatching('business_subscriptions')).toHaveLength(0);
  });

  it('invoice.paid releases the claim when Stripe cannot be reached so the renewal is retried', async () => {
    mockStripe.subscriptions.retrieve.mockRejectedValue(new Error('stripe unavailable'));
    const response = await postEvent({
      id: 'evt_invoice_retry',
      type: 'invoice.paid',
      data: { object: { id: 'in_3', parent: { subscription_details: { subscription: 'sub_1' } } } },
    });

    expect(response.status).toBe(500);
    expect(callsMatching('UPDATE business_subscriptions')).toHaveLength(0);
    expect(callsMatching('DELETE FROM webhook_events')[0][1]).toEqual(['evt_invoice_retry']);
  });
});
