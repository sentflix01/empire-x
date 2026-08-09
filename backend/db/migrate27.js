/**
 * Migration 27 — Add parent_id to comments table for threaded replies.
 *
 * Without this column all reply inserts fail silently (column does not exist)
 * and the reply-count badge on posts is never populated correctly.
 *
 * Design: single-level threading — a reply always points to a root comment
 * (parent_id = root comment id). Replying to a reply keeps the thread flat,
 * which the backend already enforces by re-resolving to the root parent_id.
 *
 * Also adds a composite index on (post_id, parent_id) so the comment-fetch
 * query that filters by post_id and groups by parent_id uses an index scan.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
-- Add parent_id for threaded replies (nullable = top-level comment)
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- Composite index: load all comments for a post, fast group-by parent
CREATE INDEX IF NOT EXISTS idx_comments_post_parent
  ON comments(post_id, parent_id);

-- Separate index for reply lookups: find all children of a given comment
CREATE INDEX IF NOT EXISTS idx_comments_parent_id
  ON comments(parent_id)
  WHERE parent_id IS NOT NULL;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 27 — comments.parent_id for threaded replies...');
    await client.query(schema);
    console.log('✅ Migration 27 complete.');
  } catch (err) {
    console.error('❌ Migration 27 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
