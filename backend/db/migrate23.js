/** Add a user-controlled visibility setting for online and last-seen status. */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

async function run() {
  try {
    await pool.query(`
      ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS presence_visibility TEXT NOT NULL DEFAULT 'everyone'
        CHECK (presence_visibility IN ('everyone', 'nobody'));
    `);
    console.log('? Migration 23 complete.');
  } finally {
    await pool.end();
  }
}

run().catch(err => { console.error('? Migration 23 failed:', err.message); process.exit(1); });
