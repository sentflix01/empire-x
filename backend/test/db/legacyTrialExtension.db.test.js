'use strict';

/** migrate62: legacy free periods become six months, once, without touching paid plans. */
const { pool, createUser, deleteUser } = require('./helpers');
const migrate62 = require('../../db/migrate62');

let trialOwner; let paidOwner; let trialBiz; let paidBiz;

async function legacyBusiness(ownerId, status, endSql) {
  const { rows: [biz] } = await pool.query(
    `INSERT INTO businesses (owner_id, business_name, business_category, legacy_migrated_at)
     VALUES ($1, 'Legacy Trial Probe', 'shop', NOW() - INTERVAL '1 day') RETURNING id, legacy_migrated_at`,
    [ownerId],
  );
  await pool.query(
    `INSERT INTO business_subscriptions (business_id, tier, status, currency, current_period_start, current_period_end)
     VALUES ($1, 'premium', $2, 'ETB', NOW() - INTERVAL '1 day', ${endSql})`,
    [biz.id, status],
  );
  return biz;
}

const periodEnd = async (businessId) =>
  (await pool.query('SELECT current_period_end FROM business_subscriptions WHERE business_id = $1', [businessId])).rows[0].current_period_end;
const notices = async (userId) =>
  (await pool.query("SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND title = 'Your free period is extended'", [userId])).rows[0].n;

beforeAll(async () => {
  trialOwner = await createUser();
  paidOwner = await createUser();
  trialBiz = await legacyBusiness(trialOwner.id, 'trialing', "NOW() + INTERVAL '29 days'");
  paidBiz = await legacyBusiness(paidOwner.id, 'active', "NOW() + INTERVAL '29 days'");
});

afterAll(async () => {
  await deleteUser(trialOwner.id);
  await deleteUser(paidOwner.id);
});

it('extends a trialing legacy grant to six months from its creation and notifies the owner once', async () => {
  await migrate62(pool);
  const { rows: [{ expected }] } = await pool.query(
    "SELECT $1::timestamptz + INTERVAL '6 months' AS expected", [trialBiz.legacy_migrated_at],
  );
  expect(new Date(await periodEnd(trialBiz.id)).getTime()).toBe(new Date(expected).getTime());
  expect(await notices(trialOwner.id)).toBe(1);

  await migrate62(pool);
  expect(await notices(trialOwner.id)).toBe(1);
});

it('leaves a paid (active) subscription alone', async () => {
  const before = await periodEnd(paidBiz.id);
  await migrate62(pool);
  expect(new Date(await periodEnd(paidBiz.id)).getTime()).toBe(new Date(before).getTime());
  expect(await notices(paidOwner.id)).toBe(0);
});
