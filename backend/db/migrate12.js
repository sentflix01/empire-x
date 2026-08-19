/**
 * migrate12.js — is_seed column and dismissed_suggestions table
 *
 * Performs three non-destructive operations in a single transaction:
 *   1. Adds `is_seed BOOLEAN NOT NULL DEFAULT FALSE` to the `users` table.
 *   2. Backfills `is_seed = TRUE` for all existing @nodbusiness.test accounts.
 *   3. Creates the `dismissed_suggestions` table with a unique constraint on
 *      (requester_id, target_id) and an index on requester_id.
 *
 * All DDL uses IF NOT EXISTS so this migration is safe to re-run.
 *
 * Run: node db/migrate12.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
BEGIN;

-- 1. Add is_seed column to users (non-destructive, safe to re-run)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Backfill existing @nodbusiness.test accounts
UPDATE users
  SET is_seed = TRUE
  WHERE email LIKE '%@nodbusiness.test';

-- 3. Create dismissed_suggestions table
CREATE TABLE IF NOT EXISTS dismissed_suggestions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, target_id)
);

-- Index to speed up per-requester lookups
CREATE INDEX IF NOT EXISTS idx_dismissed_suggestions_requester
  ON dismissed_suggestions(requester_id);

COMMIT;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 12 — is_seed column and dismissed_suggestions table...');
    await client.query(schema);
    console.log('✅ Migration 12 complete — is_seed column backfilled, dismissed_suggestions table created.');
  } catch (err) {
    console.error('❌ Migration 12 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
