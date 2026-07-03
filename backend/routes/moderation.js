const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// Report content
router.post('/report', requireAuth, async (req, res) => {
  const { target_id, target_type, reason, details } = req.body;
  if (!target_id || !target_type || !reason) {
    return res.status(400).json({ error: 'target_id, target_type, and reason are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO reports (reporter_id, target_id, target_type, reason, details)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, target_id, target_type, reason, details || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Block a user
router.post('/block/:userId', requireAuth, async (req, res) => {
  if (req.params.userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot block yourself' });
  }
  try {
    const existing = await pool.query(
      'SELECT id FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [req.user.id, req.params.userId]
    );
    if (existing.rows.length) {
      await pool.query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [req.user.id, req.params.userId]);
      return res.json({ blocked: false });
    }
    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)',
      [req.user.id, req.params.userId]
    );
    res.json({ blocked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle block' });
  }
});

// Get list of blocked users
router.get('/blocked', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.blocked_id, up.display_name, up.avatar_url
       FROM blocks b
       LEFT JOIN user_profiles up ON up.user_id = b.blocked_id
       WHERE b.blocker_id = $1`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
});

module.exports = router;
