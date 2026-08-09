const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const engagementColumns = `
  (SELECT COUNT(*)::int FROM story_reactions sr WHERE sr.story_id = s.id) AS reaction_count,
  (SELECT COUNT(*)::int FROM story_comments sc WHERE sc.story_id = s.id) AS comment_count`;

// Get active stories (not expired) — grouped by user
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, up.display_name, up.avatar_url, ${engagementColumns},
              EXISTS(SELECT 1 FROM story_reactions mine WHERE mine.story_id = s.id AND mine.user_id = $1) AS reacted
       FROM stories s
       LEFT JOIN user_profiles up ON up.user_id = s.user_id
       WHERE s.expires_at > NOW()
       ORDER BY s.created_at DESC
       LIMIT 200`,
      [req.user?.id || null]
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
      `SELECT s.*, ${engagementColumns},
              EXISTS(SELECT 1 FROM story_reactions mine WHERE mine.story_id = s.id AND mine.user_id = $2) AS reacted
       FROM stories s WHERE s.user_id = $1 AND s.expires_at > NOW() ORDER BY s.created_at DESC`,
      [req.params.userId, req.user?.id || null]
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

// Toggle a reaction on a story.
router.post('/:id/reactions', requireAuth, async (req, res) => {
  try {
    const { rows: stories } = await pool.query('SELECT id FROM stories WHERE id = $1 AND expires_at > NOW()', [req.params.id]);
    if (!stories.length) return res.status(404).json({ error: 'Story not found or expired' });
    const { rows: existing } = await pool.query('SELECT id FROM story_reactions WHERE story_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.length) {
      await pool.query('DELETE FROM story_reactions WHERE id = $1', [existing[0].id]);
      return res.json({ reacted: false });
    }
    await pool.query('INSERT INTO story_reactions (story_id, user_id, emoji) VALUES ($1, $2, $3)', [req.params.id, req.user.id, req.body.emoji || '❤️']);
    res.status(201).json({ reacted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to react to story' });
  }
});

router.get('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM story_comments WHERE story_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch story replies' });
  }
});

// Story replies are private to the viewer UI but retained as comments for the
// story owner and other viewers to review while the story remains active.
router.post('/:id/comments', requireAuth, async (req, res) => {
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if (!content) return res.status(400).json({ error: 'Reply is required' });
  if (content.length > 1000) return res.status(400).json({ error: 'Reply must be 1,000 characters or fewer' });
  try {
    const { rows: stories } = await pool.query('SELECT id FROM stories WHERE id = $1 AND expires_at > NOW()', [req.params.id]);
    if (!stories.length) return res.status(404).json({ error: 'Story not found or expired' });
    const { rows: profiles } = await pool.query('SELECT display_name, avatar_url FROM user_profiles WHERE user_id = $1', [req.user.id]);
    const profile = profiles[0] || {};
    const { rows } = await pool.query(
      `INSERT INTO story_comments (story_id, author_id, author_name, author_avatar, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, req.user.id, profile.display_name || null, profile.avatar_url || null, content]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send story reply' });
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
