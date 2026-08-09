/**
 * Migration 28 — Add is_banned + ban_reason to users table.
 *
 * Banned users can still exist in the database (orders, messages, content
 * all preserved) but they cannot log in — the auth middleware checks this
 * flag before issuing a JWT. Admins can unban at any time.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_banned   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason  TEXT,
  ADD COLUMN IF NOT EXISTS banned_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned) WHERE is_banned = TRUE;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 28 — users.is_banned...');
    await client.query(schema);
    console.log('✅ Migration 28 complete.');
  } catch (err) {
    console.error('❌ Migration 28 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
