/**
 * migrate15.js — Add last_seen column to users table for presence tracking
 * Run: node db/migrate15.js
 */
const pool = require('./pool');

const schema = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log('Running migration 15 — last_seen column on users...');
    await client.query(schema);
    console.log('✅ Migration 15 complete.');
  } catch (err) {
    console.error('❌ Migration 15 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
