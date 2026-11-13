/**
 * migrate20.js ? Stripe payments schema support
 *
 * 1. Recreates the orders.status CHECK constraint to include 'payment_failed'
 *    and 'refunded' (keeps all existing values).
 * 2. Recreates the wallet_transactions.type CHECK to add 'pending_topup' /
 *    'failed_topup' (keeps credit/debit/withdrawal/refund).
 * 3. Adds Stripe bookkeeping columns to orders:
 *    payment_provider, stripe_payment_intent_id, business_id,
 *    amount_subtotal, amount_discount (+ index on payment intent id).
 * 4. Creates webhook_events ? idempotency ledger for Stripe webhook dedupe.
 *
 * Run: node db/migrate20.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');
const { orderStatusCheckSql } = require('./orderStatuses');

const schema = `
-- ?? 1. orders.status CHECK ? add 'payment_failed' + 'refunded' ???????????????
-- Replace only the constraint owned by this migration. Never drop unrelated
-- CHECK constraints that happen to mention the status column.
-- The full current list (db/orderStatuses.js): this re-runs on every deploy.
${orderStatusCheckSql()}

-- ?? 2. wallet_transactions.type CHECK ? add pending/failed topup ????????????
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('credit','debit','withdrawal','refund','pending_topup','failed_topup'));

-- ?? 3. Stripe bookkeeping columns on orders ?????????????????????????????????
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_subtotal NUMERIC(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_discount NUMERIC(12,2);

CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id
  ON orders(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ?? 4. Stripe webhook idempotency ledger ?????????????????????????????????????
CREATE TABLE IF NOT EXISTS webhook_events (
  id           TEXT PRIMARY KEY,
  type         TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 20 ? Stripe payments schema...');
    await client.query(schema);
    console.log('? Migration 20 complete ? orders/wallet_transactions CHECKs extended, Stripe columns + webhook_events added.');
  } catch (err) {
    console.error('? Migration 20 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
