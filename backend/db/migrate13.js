/**
 * migrate13.js — Verification requests table
 *
 * Creates the verification_requests table that stores user-submitted
 * selfie + ID document pairs for admin review.
 *
 * Run: node db/migrate13.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
CREATE TABLE IF NOT EXISTS verification_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selfie_url      TEXT NOT NULL,
  id_document_url TEXT NOT NULL,
  full_name       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  verification_type TEXT NOT NULL DEFAULT 'personal'
                  CHECK (verification_type IN ('personal', 'business', 'creator', 'official')),
  admin_note      TEXT,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)  -- one active request per user
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_status
  ON verification_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_requests_user
  ON verification_requests(user_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 13 — verification_requests table...');
    await client.query(schema);
    console.log('✅ Migration 13 complete — verification_requests table created.');
  } catch (err) {
    console.error('❌ Migration 13 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
