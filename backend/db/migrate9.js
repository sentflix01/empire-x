/**
 * migrate9.js ? Chapa payment support
 *
 * Adds chapa_tx_ref column to orders table for tracking
 * Chapa transactions alongside Stripe sessions.
 *
 * Run: node db/migrate9.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

const schema = `
-- Add Chapa transaction reference to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS chapa_tx_ref TEXT;

-- Index for fast lookup by Chapa tx_ref
CREATE INDEX IF NOT EXISTS idx_orders_chapa_tx_ref
  ON orders(chapa_tx_ref)
  WHERE chapa_tx_ref IS NOT NULL;

-- Add pending_topup and failed_topup types to wallet_transactions
-- (type is TEXT so no enum change needed ? just documenting)
-- Existing type values: credit, debit, withdrawal, refund
-- New values: pending_topup, failed_topup (Chapa flow)
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 9 ? Chapa payment support...');
    await client.query(schema);
    console.log('? Migration 9 complete ? chapa_tx_ref column added to orders.');
  } catch (err) {
    console.error('? Migration 9 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
