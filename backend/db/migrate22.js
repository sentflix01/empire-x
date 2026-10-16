/**
 * migrate22.js ? Repair/verification for migrate20's broad constraint drops
 *
 * Background (task #31 review finding 7):
 *   migrate20 dropped CHECK constraints matching ILIKE '%status%' on `orders`
 *   and ILIKE '%type%' on `wallet_transactions`. Those patterns were too
 *   broad in principle. A pg_constraint audit of the live Neon database
 *   (after migrate20 ran) confirmed NO unintended constraints were dropped:
 *
 *     orders:              exactly one CHECK ? orders_status_check
 *                          (pending, paid, processing, completed, cancelled,
 *                          payment_failed, refunded); PK, 4 FKs and all
 *                          NOT NULLs intact.
 *     wallet_transactions: exactly one CHECK ? wallet_transactions_type_check
 *                          (credit, debit, withdrawal, refund, pending_topup,
 *                          failed_topup); PK, wallet FK and NOT NULLs intact.
 *
 * This migration makes the intended end-state self-healing: it recreates the
 * two constraints idempotently using EXACT names (no wildcard matching), so
 * any future re-run or drift is repaired safely without ever touching
 * unrelated constraints.
 *
 * Run: node db/migrate22.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');
const { orderStatusCheckSql } = require('./orderStatuses');

const schema = `
-- ?? orders.status ? exact-name drop + recreate (idempotent) ?????????????????
-- The full current list (db/orderStatuses.js): this re-runs on every deploy.
${orderStatusCheckSql()}

-- ?? wallet_transactions.type ? exact-name drop + recreate (idempotent) ?????
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('credit','debit','withdrawal','refund','pending_topup','failed_topup'));
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 22 ? idempotent CHECK constraint repair (orders.status, wallet_transactions.type)...');
    await client.query(schema);
    console.log('? Migration 22 complete ? constraints verified/recreated with exact names.');
  } catch (err) {
    console.error('? Migration 22 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
