const router = require('express').Router();
const pool = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');

/**
 * Parse hashtags from post content and upsert them.
 * Returns array of hashtag names found.
 */
async function syncHashtags(postId, content) {
  const found = [...new Set((content.match(/#[\w\u1200-\u137F]+/g) || []).map(h => h.slice(1).toLowerCase()))];
  // Remove old hashtag links for this post
  await pool.query('DELETE FROM post_hashtags WHERE post_id = $1', [postId]);
  for (const name of found) {
    // Upsert hashtag
    const { rows } = await pool.query(
      `INSERT INTO hashtags (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET post_count = hashtags.post_count + 1
       RETURNING id`,
      [name]
    );
    await pool.query(
      'INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, rows[0].id]
    );
  }
  return found;
}

// Trending hashtags
router.get('/trending', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT name, post_count FROM hashtags ORDER BY post_count DESC LIMIT 20'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hashtags' });
  }
});

// Posts for a hashtag
router.get('/:name/posts', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.* FROM posts p
       JOIN post_hashtags ph ON ph.post_id = p.id
       JOIN hashtags h ON h.id = ph.hashtag_id
       WHERE h.name = $1
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [req.params.name.toLowerCase()]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

module.exports = router;
module.exports.syncHashtags = syncHashtags;
