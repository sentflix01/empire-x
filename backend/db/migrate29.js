/**
 * migrate29.js — app_settings table
 *
 * General-purpose key-value store for platform-wide settings.
 * Used by:
 *   - DevOps strategy version statuses  (key: 'devops_version_statuses')
 *   - Feature flag overrides from admin UI
 *   - Any future singleton config values
 *
 * Run: node db/migrate29.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_settings IS
  'Singleton key-value store for platform settings. One row per setting key.';
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 29 — app_settings table...');
    await client.query(schema);
    console.log('✅ Migration 29 complete — app_settings table created.');
  } catch (err) {
    console.error('❌ Migration 29 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
