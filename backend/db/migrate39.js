/**
 * Migration 39 ? mark built-in demo accounts independently from generated seed content.
 * New registrations default to real accounts. Existing fake personas and the
 * built-in test account are marked demo so their sessions bypass Redis.
 * admin@nodbusiness.app is the real platform admin (owner decision 2026-10-15)
 * and must stay a real account; see migrate53.js.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await client.query(`
      UPDATE users
      SET is_demo = TRUE
      WHERE is_seed = TRUE
         OR email = 'test@nodbusiness.app'
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(id) WHERE is_demo = TRUE');
    await client.query('COMMIT');
    console.log('Migration 39 complete ? demo accounts marked.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration 39 failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
