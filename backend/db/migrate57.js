/**
 * migrate57.js - Direct payment and guest checkout.
 *
 * NodBusiness never holds funds: the buyer pays the seller directly, reports
 * the payment, and the seller confirms it. Guests buy without an account and
 * follow their order through a private link (only the token's SHA-256 hash is
 * stored). Unconfirmed orders expire after 7 days.
 * See docs/decisions/platform-model-decisions.md §2.1–2.2.
 */
const { orderStatusCheckSql } = require('./orderStatuses');

module.exports = async function migrate57(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE orders ALTER COLUMN buyer_id DROP NOT NULL;
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS access_token_hash TEXT,
        ADD COLUMN IF NOT EXISTS payment_reported_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS payment_reference TEXT,
        ADD COLUMN IF NOT EXISTS receipt_key TEXT,
        ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_access_token_hash ON orders(access_token_hash) WHERE access_token_hash IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_direct_expiry ON orders(payment_expires_at)
        WHERE status IN ('awaiting_payment', 'payment_reported');
      ${orderStatusCheckSql()}
      -- A guest order must carry contact details instead of an account.
      ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_buyer_identity_check;
      ALTER TABLE orders ADD CONSTRAINT orders_buyer_identity_check
        CHECK (buyer_id IS NOT NULL OR (access_token_hash IS NOT NULL AND buyer_email IS NOT NULL AND buyer_phone IS NOT NULL));
    `);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
};
