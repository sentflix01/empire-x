/**
 * migrate64.js - Request to order for website items that are not catalogue products.
 *
 * Owners type services, packages and best sellers into their website
 * sections; those have a name and a display price ("From $16", "Free") but no
 * product row. A buyer can request one: the order starts as 'requested' with
 * no price, the seller sets the price, and it continues as a normal direct
 * order ('awaiting_payment' → paid). listed_price_text keeps the price shown
 * on the website at the time of the request, for the seller's reference.
 * Idempotent: safe to re-run on every deploy.
 */
const { orderStatusCheckSql } = require('./orderStatuses');

module.exports = async function migrate64(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS listed_price_text TEXT;
      ${orderStatusCheckSql()}
      CREATE INDEX IF NOT EXISTS idx_orders_requested_expiry ON orders(payment_expires_at) WHERE status = 'requested';
    `);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
};
