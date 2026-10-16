/**
 * migrate61.js - posts.edited_at for the "Edited" label.
 *
 * updated_at also moves for system writes, so the label needs its own column.
 * It is set only when the author (or an admin) edits the post's content or
 * photo through PUT /api/posts/:id.
 * Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate61(pool) {
  await pool.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ');
};
