/**
 * Migration 24 — Repair posts.comment_count (BUG-3).
 *
 * Seed data historically wrote a random comment_count (0-40) on posts while
 * inserting far fewer actual comment rows, so feed badges showed inflated
 * numbers. This recomputes comment_count from the comments table for every
 * post so the stored counter matches GET /api/posts/:id/comments.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

async function run() {
  try {
    const { rowCount } = await pool.query(`
      UPDATE posts p SET comment_count = (
        SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id
      )
    `);
    console.log(`✅ Migration 24 complete — comment_count recomputed on ${rowCount} posts.`);
  } finally {
    await pool.end();
  }
}

run().catch(err => { console.error('❌ Migration 24 failed:', err.message); process.exit(1); });
