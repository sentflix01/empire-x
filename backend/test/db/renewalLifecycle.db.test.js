'use strict';

/**
 * Renewal reminders and expiry safety for prepaid plans, against real Postgres
 * with Chapa in sandbox mode:
 *   - "ends in 3 days" reminders for paid plans and free periods, once each;
 *   - in-app expiry notices even when email fails;
 *   - no removal while a renewal may still be confirming, and a late payment
 *     that confirms rescues the business;
 *   - abandoned checkouts get a last check, then expire.
 */
process.env.CHAPA_SECRET_KEY = 'SANDBOX';

const { pool, createUser, deleteUser, tag } = require('./helpers');
const { runBusinessSubscriptionLifecycle } = require('../../scripts/business-subscription-lifecycle');
const { sandboxConfirm } = require('../../lib/chapaClient');

const DAY = 86_400_000;
let owner;
const created = [];

async function business(name, sub) {
  const { rows: [b] } = await pool.query(
    `INSERT INTO businesses (owner_id, business_name, business_category) VALUES ($1, $2, 'shop') RETURNING id`,
    [owner.id, `${name} ${tag()}`],
  );
  await pool.query(
    `INSERT INTO business_subscriptions (business_id, tier, status, currency, billing_provider, current_period_start, current_period_end)
     VALUES ($1, 'normal', $2, 'ETB', 'chapa', NOW() - INTERVAL '30 days', $3)`,
    [b.id, sub.status ?? 'active', sub.end],
  );
  created.push(b.id);
  return b.id;
}

async function pendingPayment(businessId, { ageDays = 0 } = {}) {
  const ref = `nbsub-test-${tag()}${tag()}`;
  await pool.query(
    `INSERT INTO subscription_payments (business_id, user_id, provider, provider_ref, kind, tier, months, amount, created_at)
     VALUES ($1, $2, 'chapa', $3, 'renewal', 'normal', 1, 100, NOW() - make_interval(days => $4))`,
    [businessId, owner.id, ref, ageDays],
  );
  return ref;
}

const notifications = async (title) =>
  (await pool.query('SELECT body FROM notifications WHERE user_id = $1 AND title = $2', [owner.id, title])).rows;
const exists = async (id) => (await pool.query('SELECT 1 FROM businesses WHERE id = $1', [id])).rowCount === 1;
const paymentStatus = async (ref) => (await pool.query('SELECT status FROM subscription_payments WHERE provider_ref = $1', [ref])).rows[0].status;

beforeAll(async () => { owner = await createUser(); });
afterAll(async () => {
  await pool.query('DELETE FROM business_creation_blocks WHERE owner_id = $1', [owner.id]);
  await deleteUser(owner.id);
});

const okEmail = () => jest.fn().mockResolvedValue(undefined);

it('reminds owners 3 days before a plan or free period ends, once', async () => {
  const now = new Date();
  await business('Ending Soon', { end: new Date(now.getTime() + 2 * DAY) });
  await business('Trial Ending', { status: 'trialing', end: new Date(now.getTime() + 2 * DAY) });
  await business('Far Away', { end: new Date(now.getTime() + 20 * DAY) });
  const sendEmail = okEmail();

  await runBusinessSubscriptionLifecycle(now, { sendEmail });
  await runBusinessSubscriptionLifecycle(now, { sendEmail });

  expect(await notifications('Your plan ends soon')).toHaveLength(1);
  expect(await notifications('Your free period ends soon')).toHaveLength(1);
  const reminderEmails = sendEmail.mock.calls.filter(([to, subject]) => to === owner.email && /ends in 3 days/.test(subject));
  expect(reminderEmails).toHaveLength(2);
  expect(reminderEmails.map(([, subject]) => subject).join(' ')).toMatch(/Your free period ends in 3 days/);
});

it('still notifies in the app when the expiry email fails', async () => {
  const now = new Date();
  const id = await business('Overdue Four', { end: new Date(now.getTime() - 4 * DAY) });
  const failingEmail = jest.fn().mockRejectedValue(new Error('provider down'));
  await runBusinessSubscriptionLifecycle(now, { sendEmail: failingEmail });
  expect((await notifications('Your plan has ended')).length).toBeGreaterThanOrEqual(1);
  expect(await exists(id)).toBe(true);
});

it('does not remove a business while a renewal is still confirming, and a late payment rescues it', async () => {
  const now = new Date();
  const id = await business('Paying Late', { end: new Date(now.getTime() - 11 * DAY) });
  const ref = await pendingPayment(id);

  const first = await runBusinessSubscriptionLifecycle(now, { sendEmail: okEmail() });
  expect(first.postponed).toBeGreaterThanOrEqual(1);
  expect(await exists(id)).toBe(true);

  sandboxConfirm(ref, 100);
  await runBusinessSubscriptionLifecycle(now, { sendEmail: okEmail() });
  expect(await exists(id)).toBe(true);
  expect(await paymentStatus(ref)).toBe('paid');
  const { rows: [sub] } = await pool.query('SELECT current_period_end FROM business_subscriptions WHERE business_id = $1', [id]);
  expect(new Date(sub.current_period_end).getTime()).toBeGreaterThan(now.getTime());
});

it('removes a business ten days overdue when nothing is pending', async () => {
  const now = new Date();
  const id = await business('Gone', { end: new Date(now.getTime() - 11 * DAY) });
  await runBusinessSubscriptionLifecycle(now, { sendEmail: okEmail() });
  expect(await exists(id)).toBe(false);
  expect((await notifications('Business profile removed')).length).toBeGreaterThanOrEqual(1);
});

it('gives abandoned checkouts a last check, then expires them', async () => {
  const id = await business('Checkout Probe', { end: new Date(Date.now() + 40 * DAY) });
  const abandoned = await pendingPayment(id, { ageDays: 2 });
  const latePaid = await pendingPayment(id, { ageDays: 2 });
  sandboxConfirm(latePaid, 100);
  const result = await runBusinessSubscriptionLifecycle(new Date(), { sendEmail: okEmail() });
  expect(await paymentStatus(abandoned)).toBe('expired');
  expect(await paymentStatus(latePaid)).toBe('paid');
  expect(result.lateCheckoutsPaid).toBeGreaterThanOrEqual(1);
});
