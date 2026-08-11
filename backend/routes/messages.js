const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');
const { emitNewMessage, emitMessageEdited, emitMessageDeleted, emitPresenceUpdated, emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');
const logger = require('../lib/logger');
const { getRedis } = require('../lib/redis');

function parseParticipantIds(value) {
  try {
    const ids = Array.isArray(value) ? value : JSON.parse(value || '[]');
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
}

function isConversationParticipant(conversation, userId) {
  return parseParticipantIds(conversation.participant_ids).includes(String(userId));
}

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
    if (!isConversationParticipant(conv, req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Find or create DM conversation
router.post('/conversations/find-or-create', requireAuth, async (req, res) => {
  const { target_user_id } = req.body;
  if (!target_user_id) return res.status(400).json({ error: 'target_user_id is required' });

  try {
    const userId = req.user.id;
    if (String(target_user_id) === String(userId)) {
      return res.status(400).json({ error: 'Cannot create a direct message with yourself' });
    }
    // Fix #9: use proper JSON containment instead of fragile LIKE text search
    const { rows: all } = await pool.query(
      `SELECT * FROM conversations WHERE type = 'dm' AND participant_ids::jsonb @> $1::jsonb`,
      [JSON.stringify([userId])]
    );
    const existing = all.find(c => {
      const ids = parseParticipantIds(c.participant_ids);
      return ids.length === 2 && ids.includes(String(userId)) && ids.includes(String(target_user_id));
    });
    if (existing) return res.json(existing);

    // Fetch current user name
    const { rows: profiles } = await pool.query(
      'SELECT user_id, display_name FROM user_profiles WHERE user_id = ANY($1::uuid[])',
      [[userId, target_user_id]]
    );
    const myProfiles = profiles.filter(profile => String(profile.user_id) === String(userId));
    const targetProfile = profiles.find(profile => String(profile.user_id) === String(target_user_id));
    if (!targetProfile) return res.status(404).json({ error: 'User not found' });
    const myName = myProfiles[0]?.display_name || 'User';

    const conv = await createRecord('conversations', {
      participant_ids: JSON.stringify([String(userId), String(target_user_id)]),
      participant_names: JSON.stringify([myName, targetProfile.display_name || 'User']),
      type: 'dm',
      last_message: '',
    });
    res.status(201).json(conv);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to find or create conversation');
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
    if (!isConversationParticipant(conv, req.user.id) && req.user.role !== 'admin') {
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

    // Robust participant check — compare as strings to handle type mismatches
    const ids = parseParticipantIds(conv.participant_ids);
    const userId = String(req.user.id);
    const isParticipant = ids.includes(userId);

    if (!isParticipant && req.user.role !== 'admin') {
      logger.warn({ userId, convId: req.params.convId, ids }, 'User not in conversation');
      return res.status(403).json({ error: 'Forbidden — not a participant' });
    }

    const { content, type, reply_to_id } = req.body;
    const cleanContent = typeof content === 'string' ? content.trim() : '';
    if (!cleanContent) return res.status(400).json({ error: 'content is required' });
    if (cleanContent.length > 4000) return res.status(400).json({ error: 'Message must be 4,000 characters or fewer' });
    const messageType = ['text', 'image', 'file'].includes(type) ? type : 'text';

    // A blocked relationship must be enforced by the API, not only hidden by
    // the client UI. This also prevents a blocked person from sending via REST.
    if (conv.type === 'dm') {
      const otherUserId = ids.find(participantId => participantId !== userId);
      const { rows: blocks } = await pool.query(
        `SELECT id FROM blocks
         WHERE (blocker_id = $1 AND blocked_id = $2)
            OR (blocker_id = $2 AND blocked_id = $1)
         LIMIT 1`,
        [req.user.id, otherUserId]
      );
      if (blocks.length) return res.status(403).json({ error: 'You cannot send messages in this conversation' });
    }

    const { rows: profiles } = await pool.query(
      'SELECT display_name FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const senderName = profiles[0]?.display_name || null;

    const { rows } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_name, content, type, reply_to_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.convId, req.user.id, senderName, cleanContent, messageType, reply_to_id || null]
    );

    // Update conversation last message
    await pool.query(
      'UPDATE conversations SET last_message = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2',
      [messageType === 'image' ? '📷 Photo' : messageType === 'file' ? '📎 File' : cleanContent.slice(0, 200), req.params.convId]
    );

    emitNewMessage(req.params.convId, rows[0]);

    // Notify all participants except the sender — this powers the Messages nav
    // badge, conversation-list unread indicator, and Notifications page.
    const recipients = ids.filter(pid => pid !== userId);
    const previewText = messageType === 'image' ? '📷 Photo'
      : messageType === 'file' ? '📎 File'
      : cleanContent.slice(0, 80);
    const convName = conv.name || senderName || 'New message';

    // Fire-and-forget — don't block the response
    (async () => {
      for (const recipientId of recipients) {
        try {
          const { rows: [notif] } = await pool.query(
            `INSERT INTO notifications (user_id, type, title, body, link, is_read)
             VALUES ($1, 'message', $2, $3, $4, false) RETURNING *`,
            [
              recipientId,
              `${senderName || 'Someone'}: ${previewText}`,
              conv.type === 'dm' ? previewText : `${senderName || 'Someone'}: ${previewText}`,
              `/messages/${req.params.convId}`,
            ]
          );
          emitNotification(recipientId, notif);
          sendPushToUser(recipientId, notif.title, notif.body, notif.link).catch(() => {});
        } catch { /* never block message delivery over a notification failure */ }
      }
    })();

    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack, code: err.code, detail: err.detail }, 'Failed to send message');
    res.status(500).json({ error: 'Failed to send message', detail: err.message, code: err.code });
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
    emitMessageEdited(updated[0].conversation_id, updated[0]);
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
    const deletedMsg = rows[0];
    await deleteRecord('messages', req.params.id);
    emitMessageDeleted(deletedMsg.conversation_id, req.params.id);
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

// ── In-memory presence fallback when Redis is not configured ─────────────
// { userId: { status: 'online'|'offline', last_seen: ISO string } }
const memPresence = {};

// ── Presence: Redis when available, with an in-memory development fallback ──
// Set online presence status
router.put('/presence', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['online', 'offline', 'away'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'status must be online, offline, or away' });
    }
    const now = new Date().toISOString();

    // In-memory store — zero Redis cost, works across single-instance deployments
    const presence = { status, last_seen: now };
    memPresence[req.user.id] = presence;

    // Persist the short-lived live status when Redis is available so a second
    // server instance returns the same answer. In-memory storage remains the
    // development fallback.
    const redis = getRedis();
    if (!redis.isNoOp) {
      // Presence must still work when an optional Redis service is down. The
      // in-memory store and database timestamp below are the safe fallback.
      try {
        await redis.set(`presence:${req.user.id}`, JSON.stringify(presence), 'EX', 15 * 60);
      } catch (err) {
        logger.warn({ err: err.message }, 'Presence Redis write failed; using fallback');
      }
    }

    // Persist both chat entry and chat exit. This makes "last seen" mean the
    // exact time a person left Messages, even if Redis later expires/restarts.
    if (status === 'online' || status === 'offline') {
      pool.query(
        'UPDATE users SET updated_at = NOW(), last_seen = NOW() WHERE id = $1',
        [req.user.id]
      ).catch(() =>
        pool.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [req.user.id]).catch(() => {})
      );
    }

    emitPresenceUpdated(req.user.id, presence);
    res.json({ success: true, ...presence });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to update presence');
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

// Get online presence of a user — returns { status, last_seen }
router.get('/presence/:userId', requireAuth, async (req, res) => {
  try {
    // A blocked user must not learn whether the blocker is active or recently
    // active. The UI renders this privacy-safe response as "a long time ago".
    if (String(req.user.id) !== String(req.params.userId)) {
      const { rows: blocked } = await pool.query(
        'SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1',
        [req.params.userId, req.user.id]
      );
      if (blocked.length) {
        return res.json({ user_id: req.params.userId, status: 'offline', last_seen: null, hidden: true });
      }
      try {
        const { rows: profiles } = await pool.query(
          'SELECT presence_visibility FROM user_profiles WHERE user_id = $1',
          [req.params.userId]
        );
        if (profiles[0]?.presence_visibility === 'nobody') {
          return res.json({ user_id: req.params.userId, status: 'offline', last_seen: null, hidden: true });
        }
      } catch { /* Backward-compatible until the privacy migration is applied. */ }
    }
    const redis = getRedis();
    let status = 'offline';
    let last_seen = null;

    // 1. Try Redis first
    if (!redis.isNoOp) {
      try {
        const cached = await redis.get(`presence:${req.params.userId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            status = parsed.status || 'offline';
            last_seen = parsed.last_seen || null;
          } catch {
            status = cached === 'online' ? 'online' : 'offline';
          }
        }
      } catch (err) {
        logger.warn({ err: err.message }, 'Presence Redis read failed; using fallback');
      }
    }

    // 2. If no Redis or Redis miss, check in-memory store
    if (memPresence[req.params.userId]) {
      const mem = memPresence[req.params.userId];
      last_seen = mem.last_seen;
      const diff = Date.now() - new Date(mem.last_seen).getTime();
      // Within the 15-min heartbeat window: use the stored status as-is
      // (preserves 'away', 'offline', etc — never upgrades to 'online')
      // Outside the window: force 'offline' (heartbeat stopped = session ended)
      if (diff < 15 * 60 * 1000) {
        status = mem.status; // honour exactly what was stored
      } else {
        status = 'offline';
      }
    }

    // 3. DB fallback for last_seen timestamp only (don't use for online detection)
    if (!last_seen) {
      try {
        // Try last_seen column first (post-migration)
        const { rows } = await pool.query(
          'SELECT last_seen FROM users WHERE id = $1',
          [req.params.userId]
        );
        if (rows.length && rows[0].last_seen) {
          last_seen = rows[0].last_seen;
        }
      } catch {
        // last_seen column doesn't exist yet — skip
      }
    }

    res.json({ user_id: req.params.userId, status, last_seen, hidden: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get presence' });
  }
});

router.put('/presence/settings', requireAuth, async (req, res) => {
  const { visibility } = req.body;
  if (!['everyone', 'nobody'].includes(visibility)) {
    return res.status(400).json({ error: 'visibility must be everyone or nobody' });
  }
  try {
    await pool.query(
      'UPDATE user_profiles SET presence_visibility = $1, updated_at = NOW() WHERE user_id = $2',
      [visibility, req.user.id]
    );
    res.json({ visibility });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to update presence privacy');
    res.status(500).json({ error: 'Failed to update presence privacy' });
  }
});

// ── Block / Unblock ───────────────────────────────────────────────────────────

// Block a user
router.post('/block/:targetId', requireAuth, async (req, res) => {
  const { targetId } = req.params;
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });
  try {
    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, targetId]
    );
    res.json({ success: true, blocked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock a user
router.delete('/block/:targetId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [req.user.id, req.params.targetId]
    );
    res.json({ success: true, blocked: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// Check if a user is blocked
router.get('/block/:targetId', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [req.user.id, req.params.targetId]
    );
    res.json({ blocked: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check block status' });
  }
});


// Forward message to another conversation
router.post('/messages/:id/forward', requireAuth, async (req, res) => {
  try {
    const { rows: src } = await pool.query('SELECT * FROM messages WHERE id = $1', [req.params.id]);
    if (!src.length) return res.status(404).json({ error: 'Message not found' });

    const { target_conversation_id } = req.body;
    if (!target_conversation_id) return res.status(400).json({ error: 'target_conversation_id is required' });

    const conv = await getRecord('conversations', target_conversation_id);
    if (!conv) return res.status(404).json({ error: 'Target conversation not found' });

    const ids = parseParticipantIds(conv.participant_ids);
    if (!ids.includes(String(req.user.id)) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { rows: profiles } = await pool.query(
      'SELECT display_name FROM user_profiles WHERE user_id = $1', [req.user.id]
    );
    const senderName = profiles[0]?.display_name || null;
    const forwardedContent = src[0].content;
    const messageType = src[0].type || 'text';

    const { rows } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_name, content, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [target_conversation_id, req.user.id, senderName, forwardedContent, messageType]
    );

    await pool.query(
      'UPDATE conversations SET last_message = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2',
      [messageType === 'image' ? '📷 Photo' : forwardedContent.slice(0, 200), target_conversation_id]
    );

    emitNewMessage(target_conversation_id, rows[0]);

    // Notify recipients
    const userId = String(req.user.id);
    const recipients = ids.filter(pid => pid !== userId);
    const previewText = messageType === 'image' ? '📷 Photo' : forwardedContent.slice(0, 80);
    for (const recipientId of recipients) {
      pool.query(
        `INSERT INTO notifications (user_id, type, title, body, link, is_read)
         VALUES ($1, 'message', $2, $3, $4, false) RETURNING *`,
        [recipientId, `${senderName || 'Someone'} forwarded a message`, previewText, `/messages/${target_conversation_id}`]
      ).then(({ rows: [notif] }) => {
        emitNotification(recipientId, notif);
        sendPushToUser(recipientId, notif.title, notif.body, notif.link).catch(() => {});
      }).catch(() => {});
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to forward message');
    res.status(500).json({ error: 'Failed to forward message' });
  }
});

// ── Inquiry / Get Quote ───────────────────────────────────────────────────────
// POST /api/messages/inquiry — send a service inquiry to a business owner.
// Creates a DM conversation (or reuses existing) and sends the inquiry as a
// message, plus fires a notification so the owner is alerted immediately.
router.post('/inquiry', requireAuth, async (req, res) => {
  const { receiver_id, subject, body } = req.body;
  if (!receiver_id) return res.status(400).json({ error: 'receiver_id is required' });
  if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });

  const senderId = req.user.id;

  // Don't allow sending inquiry to yourself
  if (String(receiver_id) === String(senderId)) {
    return res.status(400).json({ error: 'Cannot send inquiry to yourself' });
  }

  try {
    // Find or create a DM conversation between sender and receiver
    const participantIds = JSON.stringify([String(senderId), String(receiver_id)]);
    let conv;

    const { rows: existing } = await pool.query(
      `SELECT * FROM conversations
       WHERE participant_ids::jsonb @> $1::jsonb
         AND participant_ids::jsonb @> $2::jsonb
         AND type = 'dm'
       LIMIT 1`,
      [JSON.stringify([String(senderId)]), JSON.stringify([String(receiver_id)])]
    );

    if (existing.length > 0) {
      conv = existing[0];
    } else {
      const { rows: created } = await pool.query(
        `INSERT INTO conversations (participant_ids, type, created_at, updated_at)
         VALUES ($1, 'dm', NOW(), NOW()) RETURNING *`,
        [participantIds]
      );
      conv = created[0];
    }

    // Insert the inquiry as a message
    const messageText = subject ? `📋 ${subject}\n\n${body}` : body;
    const { rows: msgs } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [conv.id, senderId, messageText]
    );
    const msg = msgs[0];

    // Update conversation timestamp
    await pool.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conv.id]
    );

    // Emit real-time socket event to the receiver
    try {
      emitNewMessage(String(receiver_id), { ...msg, conversation_id: conv.id });
    } catch { /* socket optional */ }

    // Create a notification for the business owner
    try {
      const senderName = req.user.full_name || req.user.email || 'Someone';
      const notifTitle = subject || 'New Inquiry';
      const notifBody = `${senderName} sent you an inquiry.`;
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, link, created_at)
         VALUES ($1, 'inquiry', $2, $3, $4, NOW())`,
        [receiver_id, notifTitle, notifBody, `/messages/${conv.id}`]
      );
      try {
        await sendPushToUser(receiver_id, notifTitle, notifBody, `/messages/${conv.id}`);
      } catch { /* push optional */ }
      try {
        emitNotification(String(receiver_id), {
          type: 'inquiry', title: notifTitle, body: notifBody, link: `/messages/${conv.id}`,
        });
      } catch { /* socket optional */ }
    } catch { /* notification failure must not block inquiry response */ }

    res.status(201).json({ success: true, conversation_id: conv.id, message_id: msg.id });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to send inquiry');
    res.status(500).json({ error: 'Failed to send inquiry' });
  }
});

module.exports = router;

