/**
 * migrate11.js — Composite indexes for performance
 *
 * Adds targeted composite indexes to support the most frequent query patterns:
 *   - notifications: unread count query on every authenticated page load
 *   - orders: seller and buyer list queries
 *   - products: marketplace and showroom listing queries
 *
 * All indexes use CREATE INDEX IF NOT EXISTS so this migration is safe to re-run.
 *
 * Run: node db/migrate11.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
-- Notifications: unread count query on every authenticated page load
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, is_read, created_at DESC);

-- Orders: seller and buyer list queries
CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created
  ON orders(seller_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_status_created
  ON orders(buyer_id, status, created_at DESC);

-- Products: marketplace and showroom listing queries
CREATE INDEX IF NOT EXISTS idx_products_seller_status_created
  ON products(seller_id, status, created_at DESC);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 11 — composite indexes...');
    await client.query(schema);
    console.log('✅ Migration 11 complete — composite indexes created.');
  } catch (err) {
    console.error('❌ Migration 11 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
