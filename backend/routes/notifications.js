const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { createRecord, updateRecord, deleteRecord } = require('../utils/crud');
const { emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');

// Get my notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const { is_read, limit = 50 } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const values = [req.user.id];
    if (is_read !== undefined) {
      query += ` AND is_read = $2`;
      values.push(is_read === 'true' || is_read === true);
    }
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1}`;
    values.push(Math.min(parseInt(limit, 10) || 50, 200));
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Create notification (internal use / admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { user_id, type, title, body, link } = req.body;
    if (!user_id || !type || !title) {
      return res.status(400).json({ error: 'user_id, type, and title are required' });
    }
    const notif = await createRecord('notifications', {
      user_id,
      type,
      title,
      body: body || '',
      link: link || '',
      is_read: false,
    });
    // Push real-time notification to the recipient via Socket.IO
    emitNotification(user_id, notif);
    // Also send a Web Push notification (works when app is closed)
    sendPushToUser(user_id, title, body || '', link || '/notifications').catch(() => {});
    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark all as read  ← must be BEFORE /:id/read to avoid route conflict
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Mark as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT user_id FROM notifications WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Notification not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const updated = await updateRecord('notifications', req.params.id, { is_read: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Delete notification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT user_id FROM notifications WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Notification not found' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('notifications', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
