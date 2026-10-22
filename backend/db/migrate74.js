/**
 * migrate74.js - Feed Spotlight columns for showrooms.
 *
 * Adds three columns that let business owners configure which showroom
 * section(s) appear as an interactive widget below their card in the
 * social feed. Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate74(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE showrooms
        ADD COLUMN IF NOT EXISTS spotlight_mode TEXT
          CHECK (spotlight_mode IN ('single','carousel')),
        ADD COLUMN IF NOT EXISTS spotlight_section_ids JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS spotlight_carousel_count INTEGER NOT NULL DEFAULT 1
    `);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
