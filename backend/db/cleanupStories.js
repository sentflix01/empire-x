/**
 * cleanupStories.js
 * Deletes expired stories from the DB and schedules itself every hour.
 * Called once from index.js on server start.
 */
const pool = require('./pool');

async function deleteExpiredStories() {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM stories WHERE expires_at <= NOW()'
    );
    if (rowCount > 0) {
      console.log(`[stories] Cleaned up ${rowCount} expired story/stories`);
    }
  } catch (err) {
    console.error('[stories] Cleanup error:', err.message);
  }
}

function startStoriesCleanup() {
  // Run immediately on startup, then every hour
  deleteExpiredStories();
  setInterval(deleteExpiredStories, 60 * 60 * 1000);
}

module.exports = { startStoriesCleanup };
