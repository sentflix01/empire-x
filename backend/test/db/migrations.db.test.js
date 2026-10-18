'use strict';

/**
 * Every migration re-runs on each deploy. Run the whole chain again on a
 * database that already holds rows shaped like today's data (new order
 * statuses, private businesses, a legacy site with no business). This is the
 * check that would have caught the orders_status_check deploy breaker.
 */
const path = require('path');
const { execFileSync } = require('child_process');
const { pool, createUser, deleteUser, tag } = require('./helpers');

const runAll = () => execFileSync(process.execPath, [path.join(__dirname, '../../db/migrate-all.js')], {
  env: process.env, stdio: 'pipe', timeout: 110000,
});

let seller; let legacyOwner;

beforeAll(async () => {
  seller = await createUser();
  legacyOwner = await createUser();
  const { rows: [product] } = await pool.query(
    `INSERT INTO products (seller_id, title, price, status) VALUES ($1, 'Migration probe', 10, 'active') RETURNING id`, [seller.id],
  );
  for (const status of ['awaiting_payment', 'payment_reported', 'expired', 'shipped', 'confirmed']) {
    await pool.query(
      `INSERT INTO orders (seller_id, product_id, product_title, quantity, total_price, status, payment_provider, buyer_name, buyer_phone, buyer_email, access_token_hash)
       VALUES ($1, $2, 'Migration probe', 1, 10, $3, 'direct', 'Guest', '+251911000000', 'guest@example.test', $4)`,
      [seller.id, product.id, status, require('crypto').randomBytes(32).toString('hex')],
    );
  }
  await pool.query(`INSERT INTO businesses (owner_id, business_name, business_category, visibility) VALUES ($1, 'Private Probe', 'shop', 'private')`, [seller.id]);
  await pool.query(
    `INSERT INTO showrooms (owner_id, title, category, sections, status, slug) VALUES ($1, 'Legacy Probe', 'Food & Beverage', '[{"type":"hero"}]', 'published', $2)`,
    [legacyOwner.id, `legacy-probe-${tag()}`],
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM orders WHERE seller_id = $1', [seller.id]);
  await deleteUser(seller.id);
  await deleteUser(legacyOwner.id);
});

it('re-runs every migration twice on current-shaped data', () => {
  expect(() => runAll()).not.toThrow();
  expect(() => runAll()).not.toThrow();
});

it('links the legacy site to a new Business profile exactly once', async () => {
  const { rows } = await pool.query(
    `SELECT b.id, b.legacy_migrated_at IS NOT NULL AS legacy, bs.tier, bs.status
       FROM businesses b JOIN business_subscriptions bs ON bs.business_id = b.id WHERE b.owner_id = $1`,
    [legacyOwner.id],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ legacy: true, tier: 'normal', status: 'trialing' });
  const { rows: [site] } = await pool.query('SELECT business_id FROM showrooms WHERE owner_id = $1', [legacyOwner.id]);
  expect(site.business_id).toBe(rows[0].id);
});
