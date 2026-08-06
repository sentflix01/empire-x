/**
 * migrate18.js — Add verification status columns to user_profiles
 *
 * The verification flow (routes/verification.js) reads/writes
 * verification_type, verified_at and verification_note on user_profiles,
 * but no previous migration created them — GET /api/verification/status
 * failed with "column does not exist" (HTTP 500).
 *
 * Run: node db/migrate18.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS verification_type TEXT
  CHECK (verification_type IN ('personal', 'business', 'creator', 'official'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS verified_at       TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS verification_note TEXT;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 18 — add user_profiles verification columns...');
    await client.query(schema);
    console.log('✅ Migration 18 complete — verification columns added.');
  } catch (err) {
    console.error('❌ Migration 18 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
