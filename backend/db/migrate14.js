/**
 * migrate14.js — Add `edited` and `reply_to_id` columns to messages table
 *
 * Run: node db/migrate14.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 14 — edited and reply_to_id columns on messages...');
    await client.query(schema);
    console.log('✅ Migration 14 complete.');
  } catch (err) {
    console.error('❌ Migration 14 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
