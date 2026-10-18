import express from 'express';
import request from 'supertest';
import pool from '../db/pool';
import { invoicePeriod, invoiceSubscriptionId, subscriptionPeriod } from '../lib/stripeSubscriptionPeriod';

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
    if (sql.includes('RETURNING business_id')) return { rows: [{ business_id: 'biz-1' }] };
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
    expect(claim[0]).toContain('INSERT INTO webhook_events (id, type, processed_at)');
    expect(claim[0]).toContain('ON CONFLICT (id) DO NOTHING RETURNING id');
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

describe('Stripe billing period helpers (F-C2)', () => {
  it('reads the period from subscription items (current Stripe API)', () => {
    const period = subscriptionPeriod({
      items: { data: [{ current_period_start: ts('2026-10-15T00:00:00Z'), current_period_end: ts('2026-11-15T00:00:00Z') }] },
    });
    expect(period.start?.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(period.end?.toISOString()).toBe('2026-11-15T00:00:00.000Z');
  });

  it('reads legacy subscription-level fields', () => {
    const period = subscriptionPeriod({ current_period_start: ts('2026-10-01T00:00:00Z'), current_period_end: ts('2026-11-01T00:00:00Z') });
    expect(period.end?.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('returns nulls instead of an Invalid Date when Stripe sends no period', () => {
    expect(subscriptionPeriod({ items: { data: [{}] } })).toEqual({ start: null, end: null });
    expect(subscriptionPeriod({})).toEqual({ start: null, end: null });
    expect(subscriptionPeriod(null)).toEqual({ start: null, end: null });
  });

  it('finds the subscription and period on old and new invoice shapes', () => {
    expect(invoiceSubscriptionId({ subscription: 'sub_old' })).toBe('sub_old');
    expect(invoiceSubscriptionId({ parent: { subscription_details: { subscription: 'sub_new' } } })).toBe('sub_new');
    expect(invoiceSubscriptionId({ parent: null })).toBeNull();
    const period = invoicePeriod({ lines: { data: [{ period: { start: ts('2026-11-15T00:00:00Z'), end: ts('2026-12-15T00:00:00Z') } }] } });
    expect(period.end?.toISOString()).toBe('2026-12-15T00:00:00.000Z');
    expect(invoicePeriod({ lines: { data: [] } })).toEqual({ start: null, end: null });
  });
});

describe('subscription billing periods in the webhook (F-C2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    routePoolQueries();
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

  it('customer.subscription.updated takes the item period and never moves the end back', async () => {
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
    expect(update[0]).toContain('current_period_end   = GREATEST(COALESCE($4, current_period_end), current_period_end)');
    const [status, cancel, start, end, subId] = update[1] as [string, boolean, Date, Date, string];
    expect([status, cancel, subId]).toEqual(['active', false, 'sub_1']);
    expect(start.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-15T00:00:00.000Z');
  });

  it('invoice.paid extends current_period_end from the invoice line period', async () => {
    const response = await postEvent({
      id: 'evt_invoice_paid',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_1',
          customer: 'cus_1',
          parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1' } },
          lines: { data: [{ period: { start: ts('2026-11-15T00:00:00Z'), end: ts('2026-12-15T00:00:00Z') } }] },
        },
      },
    });

    expect(response.status).toBe(200);
    const [update] = callsMatching('UPDATE business_subscriptions SET');
    expect(update[0]).toContain('current_period_end   = GREATEST(COALESCE($2, current_period_end), current_period_end)');
    const [start, end, subId] = update[1] as [Date, Date, string];
    expect(start.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-15T00:00:00.000Z');
    expect(subId).toBe('sub_1');
  });

  it('invoice.paid ignores invoices that do not belong to a subscription', async () => {
    await postEvent({ id: 'evt_invoice_other', type: 'invoice.paid', data: { object: { id: 'in_2', parent: null } } });

    expect(callsMatching('business_subscriptions')).toHaveLength(0);
  });
});
