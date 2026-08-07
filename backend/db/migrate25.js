/**
 * Migration 25 — Backfill users.full_name from profile display_name (BUG-6 follow-up).
 *
 * Registration stores no name, and onboarding historically wrote only
 * user_profiles.display_name, leaving users.full_name NULL for existing
 * accounts — so /api/auth/me returned null and the nav showed "User".
 * This copies display_name into users.full_name wherever full_name is
 * NULL/empty and a profile name exists. No data is deleted or wiped.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

async function run() {
  try {
    const { rowCount } = await pool.query(`
      UPDATE users u SET full_name = up.display_name
      FROM (
        SELECT DISTINCT ON (user_id) user_id, TRIM(display_name) AS display_name
        FROM user_profiles
        WHERE display_name IS NOT NULL AND TRIM(display_name) <> ''
        ORDER BY user_id, created_at ASC
      ) up
      WHERE up.user_id = u.id
        AND (u.full_name IS NULL OR TRIM(u.full_name) = '')
    `);
    console.log(`✅ Migration 25 complete — full_name backfilled for ${rowCount} users.`);
  } finally {
    await pool.end();
  }
}

run().catch(err => { console.error('❌ Migration 25 failed:', err.message); process.exit(1); });
