const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { createRecord, updateRecord, deleteRecord } = require('../utils/crud');
const { emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');

// Get my notifications — with grouping for like/follow/comment types
router.get('/', requireAuth, async (req, res) => {
  try {
    const { is_read, limit = 20, sort } = req.query;

    // Fetch raw notifications
    let query = `SELECT id, user_id, type, title, body, link, is_read, created_at
                 FROM notifications WHERE user_id = $1`;
    const values = [req.user.id];
    if (is_read !== undefined) {
      query += ` AND is_read = $2`;
      values.push(is_read === 'true' || is_read === true);
    }
    if (sort === 'unread_first') {
      query += ` ORDER BY is_read ASC, created_at DESC`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }
    query += ` LIMIT $${values.length + 1}`;
    values.push(Math.min(parseInt(limit, 10) || 20, 200));
    const { rows } = await pool.query(query, values);

    // Group consecutive like/follow/comment notifications from the same link
    // e.g. 5 "liked your post" notifications → 1 grouped notification
    const grouped = [];
    const seen = new Map(); // key: `${type}:${link}` → index in grouped array

    for (const notif of rows) {
      const groupTypes = ['like', 'comment', 'follow'];
      if (groupTypes.includes(notif.type) && notif.link) {
        const key = `${notif.type}:${notif.link}`;
        if (seen.has(key)) {
          // Add to existing group
          const idx = seen.get(key);
          grouped[idx].group_count = (grouped[idx].group_count || 1) + 1;
          // Keep unread status if any in the group is unread
          if (!notif.is_read) grouped[idx].is_read = false;
        } else {
          // New group
          seen.set(key, grouped.length);
          grouped.push({ ...notif, group_count: 1 });
        }
      } else {
        grouped.push(notif);
      }
    }

    // Update titles for grouped notifications
    const result = grouped.map(n => {
      if ((n.group_count || 1) > 1) {
        const action = n.type === 'like' ? 'liked' : n.type === 'comment' ? 'commented on' : 'followed';
        return {
          ...n,
          title: `${n.group_count} people ${action} your post`,
        };
      }
      return n;
    });

    res.json(result);
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
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
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
