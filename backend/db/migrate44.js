/** Add per-showroom expiry for Demo-published sites. */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

async function migrate() {
  try {
    await pool.query('ALTER TABLE showrooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_showrooms_expires_at ON showrooms(expires_at) WHERE expires_at IS NOT NULL');
    console.log('Migration 44 complete: showroom expiry is available.');
  } catch (error) {
    console.error('Migration 44 failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
