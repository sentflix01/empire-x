const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// Get all saves for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { target_type } = req.query;
    let query = 'SELECT * FROM saves WHERE user_id = $1';
    const values = [req.user.id];
    if (target_type) {
      query += ' AND target_type = $2';
      values.push(target_type);
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saves' });
  }
});

// Toggle save (save or unsave)
router.post('/toggle', requireAuth, async (req, res) => {
  const { target_id, target_type } = req.body;
  if (!target_id || !target_type) {
    return res.status(400).json({ error: 'target_id and target_type are required' });
  }
  try {
    const existing = await pool.query(
      'SELECT id FROM saves WHERE user_id = $1 AND target_id = $2',
      [req.user.id, target_id]
    );
    if (existing.rows.length) {
      await pool.query('DELETE FROM saves WHERE user_id = $1 AND target_id = $2', [req.user.id, target_id]);
      return res.json({ saved: false });
    }
    await pool.query(
      'INSERT INTO saves (user_id, target_id, target_type) VALUES ($1, $2, $3)',
      [req.user.id, target_id, target_type]
    );
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle save' });
  }
});

// Check if a specific item is saved
router.get('/check/:targetId', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM saves WHERE user_id = $1 AND target_id = $2',
      [req.user.id, req.params.targetId]
    );
    res.json({ saved: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check save status' });
  }
});

module.exports = router;
