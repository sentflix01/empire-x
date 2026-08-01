/**
 * cleanupStories.js
 * Deletes expired stories from the DB and schedules itself every hour.
 * Called once from index.js on server start.
 */
const pool = require('./pool');

async function deleteExpiredStories() {
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'stories'"
    );
    if (rows.length === 0) {
      // Stories table doesn't exist yet — skip cleanup silently.
      return;
    }

    const { rowCount } = await pool.query(
      'DELETE FROM stories WHERE expires_at <= NOW()'
    );
    if (rowCount > 0) {
      console.log(`[stories] Cleaned up ${rowCount} expired story/stories`);
    }
  } catch (err) {
    if (err.code === '42P01') {
      // relation "stories" does not exist — skip cleanup silently.
      return;
    }
    console.error('[stories] Cleanup error:', err.message);
  }
}

function startStoriesCleanup() {
  // Run immediately on startup, then every hour
  deleteExpiredStories();
  setInterval(deleteExpiredStories, 60 * 60 * 1000);
}

module.exports = { startStoriesCleanup };
