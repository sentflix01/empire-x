const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');
const { emitNewMessage } = require('../socket');

// List conversations for current user
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    // Fix #9: use proper JSON containment instead of fragile LIKE text search
    const { rows } = await pool.query(
      `SELECT * FROM conversations
       WHERE participant_ids::jsonb @> $1::jsonb
       ORDER BY updated_at DESC
       LIMIT 100`,
      [JSON.stringify([userId])]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get single conversation
router.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    // Verify participant
    const ids = JSON.parse(conv.participant_ids || '[]');
    if (!ids.includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Find or create DM conversation
router.post('/conversations/find-or-create', requireAuth, async (req, res) => {
  const { target_user_id, target_name } = req.body;
  if (!target_user_id) return res.status(400).json({ error: 'target_user_id is required' });

  try {
    const userId = req.user.id;
    // Fix #9: use proper JSON containment instead of fragile LIKE text search
    const { rows: all } = await pool.query(
      `SELECT * FROM conversations WHERE type = 'dm' AND participant_ids::jsonb @> $1::jsonb`,
      [JSON.stringify([userId])]
    );
    const existing = all.find(c => {
      try {
        const ids = JSON.parse(c.participant_ids || '[]');
        return ids.length === 2 && ids.includes(userId) && ids.includes(target_user_id);
      } catch { return false; }
    });
    if (existing) return res.json(existing);

    // Fetch current user name
    const { rows: myProfiles } = await pool.query(
      'SELECT display_name FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    const myName = myProfiles[0]?.display_name || 'User';

    const conv = await createRecord('conversations', {
      participant_ids: JSON.stringify([userId, target_user_id]),
      participant_names: JSON.stringify([myName, target_name || 'User']),
      type: 'dm',
      last_message: '',
    });
    res.status(201).json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to find or create conversation' });
  }
});

// Create group/channel conversation
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const { participant_ids, type, name, description, avatar_url } = req.body;
    if (!participant_ids) return res.status(400).json({ error: 'participant_ids is required' });
    const conv = await createRecord('conversations', {
      participant_ids,
      participant_names: req.body.participant_names || null,
      type: type || 'dm',
      name: name || null,
      description: description || null,
      avatar_url: avatar_url || null,
      admin_id: req.user.id,
      last_message: '',
    });
    res.status(201).json(conv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update conversation
router.put('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.admin_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await updateRecord('conversations', req.params.id, req.body));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// ── Messages ─────────────────────────────────────────────────────────────────

// List messages in a conversation
router.get('/conversations/:convId/messages', requireAuth, async (req, res) => {
  try {
    const conv = await getRecord('conversations', req.params.convId);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const ids = JSON.parse(conv.participant_ids || '[]');
    if (!ids.includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const { rows } = await pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2',
      [req.params.convId, limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/conversations/:convId/messages', requireAuth, async (req, res) => {
  try {
    const conv = await getRecord('conversations', req.params.convId);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const ids = JSON.parse(conv.participant_ids || '[]');
    if (!ids.includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { content, type } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const { rows: profiles } = await pool.query(
      'SELECT display_name FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const senderName = profiles[0]?.display_name || null;

    const { rows } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_name, content, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.convId, req.user.id, senderName, content, type || 'text']
    );

    // Update conversation last message
    await pool.query(
      'UPDATE conversations SET last_message = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2',
      [content.slice(0, 200), req.params.convId]
    );

    emitNewMessage(req.params.convId, rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Edit message
router.put('/messages/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM messages WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });
    if (rows[0].sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });
    const { rows: updated } = await pool.query(
      'UPDATE messages SET content = $1, edited = TRUE, updated_at = NOW() WHERE id = $2 RETURNING *',
      [content, req.params.id]
    );
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/messages/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM messages WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });
    if (rows[0].sender_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('messages', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Delete all messages in a conversation (clear history) for the current user
router.delete('/conversations/:id/history', requireAuth, async (req, res) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const ids = JSON.parse(conv.participant_ids || '[]');
    if (!ids.includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
    // Delete all messages in this conversation sent by the requester
    await pool.query('DELETE FROM messages WHERE conversation_id = $1 AND sender_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Leave a group/channel conversation
router.post('/conversations/:id/leave', requireAuth, async (req, res) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const ids = JSON.parse(conv.participant_ids || '[]');
    const names = JSON.parse(conv.participant_names || '[]');
    if (!ids.includes(req.user.id)) return res.status(400).json({ error: 'Not a participant' });
    const idx = ids.indexOf(req.user.id);
    ids.splice(idx, 1);
    names.splice(idx, 1);
    await pool.query(
      'UPDATE conversations SET participant_ids = $1, participant_names = $2, updated_at = NOW() WHERE id = $3',
      [JSON.stringify(ids), JSON.stringify(names), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave conversation' });
  }
});

// Add member to group/channel (admin only)
router.post('/conversations/:id/members', requireAuth, async (req, res) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.admin_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admin can add members' });
    }
    const { user_id, display_name } = req.body;
    const ids = JSON.parse(conv.participant_ids || '[]');
    const names = JSON.parse(conv.participant_names || '[]');
    if (ids.includes(user_id)) return res.status(409).json({ error: 'Already a member' });
    ids.push(user_id);
    names.push(display_name || 'User');
    await pool.query(
      'UPDATE conversations SET participant_ids = $1, participant_names = $2, updated_at = NOW() WHERE id = $3',
      [JSON.stringify(ids), JSON.stringify(names), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from group/channel (admin only)
router.delete('/conversations/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.admin_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admin can remove members' });
    }
    const ids = JSON.parse(conv.participant_ids || '[]');
    const names = JSON.parse(conv.participant_names || '[]');
    const idx = ids.indexOf(req.params.userId);
    if (idx === -1) return res.status(404).json({ error: 'Member not found' });
    ids.splice(idx, 1);
    names.splice(idx, 1);
    await pool.query(
      'UPDATE conversations SET participant_ids = $1, participant_names = $2, updated_at = NOW() WHERE id = $3',
      [JSON.stringify(ids), JSON.stringify(names), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Delete conversation entirely (creator/admin only)
router.delete('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.admin_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admin can delete this conversation' });
    }
    await pool.query('DELETE FROM messages WHERE conversation_id = $1', [req.params.id]);
    await deleteRecord('conversations', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Set online presence status
router.put('/presence', requireAuth, async (req, res) => {
  try {
    const { status } = req.body; // 'online' | 'offline' | 'away'
    const validStatuses = ['online', 'offline', 'away'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'status must be online, offline, or away' });
    }
    // Store in Redis if available, else just update users.updated_at as proxy
    const { getRedis } = require('../lib/redis');
    const redis = getRedis();
    if (!redis.isNoOp) {
      await redis.setex(`presence:${req.user.id}`, 300, status); // 5 min TTL
    }
    // Always update the users table for persistent offline detection
    await pool.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [req.user.id]);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

// Get online presence of a user
router.get('/presence/:userId', requireAuth, async (req, res) => {
  try {
    const { getRedis } = require('../lib/redis');
    const redis = getRedis();
    let status = 'offline';
    if (!redis.isNoOp) {
      const cached = await redis.get(`presence:${req.params.userId}`);
      if (cached) status = cached;
    } else {
      // Fallback: check updated_at within last 10 minutes
      const { rows } = await pool.query(
        'SELECT updated_at FROM users WHERE id = $1',
        [req.params.userId]
      );
      if (rows.length && rows[0].updated_at) {
        const diff = Date.now() - new Date(rows[0].updated_at).getTime();
        if (diff < 10 * 60 * 1000) status = 'online';
      }
    }
    res.json({ user_id: req.params.userId, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get presence' });
  }
});

module.exports = router;
