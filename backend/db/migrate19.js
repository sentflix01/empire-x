/**
 * migrate19.js — Add cover position columns to user_profiles
 *
 * The drag-to-position cover editor (views/ProfileEdit.tsx) persists the
 * chosen crop position as "x% y%" strings (CSS object-position format).
 * NULL = default centered positioning.
 *
 * Run: node db/migrate19.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cover_position TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_cover_position TEXT;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 19 — add user_profiles cover position columns...');
    await client.query(schema);
    console.log('✅ Migration 19 complete — cover position columns added.');
  } catch (err) {
    console.error('❌ Migration 19 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
