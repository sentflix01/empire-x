const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Get active stories (not expired) — grouped by user
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, up.display_name, up.avatar_url
       FROM stories s
       LEFT JOIN user_profiles up ON up.user_id = s.user_id
       WHERE s.expires_at > NOW()
       ORDER BY s.created_at DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Get stories for a specific user
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM stories WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Create story
router.post('/', requireAuth, async (req, res) => {
  const { media_url, media_type, caption } = req.body;
  if (!media_url) return res.status(400).json({ error: 'media_url is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO stories (user_id, media_url, media_type, caption)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, media_url, media_type || 'image', caption || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// Mark story as viewed
router.post('/:id/view', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO story_views (story_id, viewer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    await pool.query(
      'UPDATE stories SET view_count = view_count + 1 WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// Delete story
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT user_id FROM stories WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Story not found' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query('DELETE FROM stories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

module.exports = router;
