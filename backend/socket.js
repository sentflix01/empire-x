const jwt = require('jsonwebtoken');
const pool = require('./db/pool');

let ioInstance = null;

// ── In-memory user cache for socket auth ─────────────────────────────────────
// Avoids a DB query per WebSocket connection.
// TTL: 5 minutes — after that the user is re-fetched from DB.
const socketUserCache = new Map(); // userId → { user, expiresAt }
const SOCKET_CACHE_TTL = 5 * 60 * 1000;

async function getSocketUser(userId) {
  const cached = socketUserCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.user;
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role FROM users WHERE id = $1',
    [userId]
  );
  if (!rows.length) return null;
  socketUserCache.set(userId, { user: rows[0], expiresAt: Date.now() + SOCKET_CACHE_TTL });
  return rows[0];
}

function initSocket(httpServer, corsOrigin) {
  const { Server } = require('socket.io');
  const origins = Array.isArray(corsOrigin)
    ? corsOrigin
    : [corsOrigin || 'http://localhost:3000'];
  ioInstance = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      // Use cache to avoid DB hit per connection
      const user = await getSocketUser(payload.sub);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    // Join personal user room so we can push notifications to this user
    socket.join(`user:${socket.user.id}`);

    socket.on('join_conversation', async (conversationId) => {
      if (!conversationId) return;
      try {
        const conversation = await getAuthorizedConversation(socket.user.id, conversationId);
        if (conversation) socket.join(`conv:${conversationId}`);
      } catch { /* Never join an unverified room. */ }
    });
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) socket.leave(`conv:${conversationId}`);
    });
    socket.on('typing', async ({ conversationId, isTyping } = {}) => {
      if (!conversationId || typeof isTyping !== 'boolean') return;
      try {
        const conversation = await getAuthorizedConversation(socket.user.id, conversationId);
        if (!conversation) return;
        const ids = JSON.parse(conversation.participant_ids || '[]').map(String);
        if (conversation.type === 'dm' && ids.length === 2) {
          const { rows } = await pool.query(
            `SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1) LIMIT 1`,
            ids
          );
          if (rows.length) return;
        }
        socket.to(`conv:${conversationId}`).emit('typing_updated', {
          conversation_id: conversationId,
          user_id: socket.user.id,
          is_typing: isTyping,
        });
      } catch { /* Ignore transient socket/database errors. */ }
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function emitNewMessage(conversationId, message) {
  if (ioInstance) {
    ioInstance.to(`conv:${conversationId}`).emit('new_message', message);
  }
}

function emitMessageEdited(conversationId, message) {
  if (ioInstance) {
    ioInstance.to(`conv:${conversationId}`).emit('message_edited', message);
  }
}

function emitMessageDeleted(conversationId, messageId) {
  if (ioInstance) {
    ioInstance.to(`conv:${conversationId}`).emit('message_deleted', { id: messageId });
  }
}

async function getAuthorizedConversation(userId, conversationId) {
  const { rows } = await pool.query(
    'SELECT participant_ids, type FROM conversations WHERE id = $1',
    [conversationId]
  );
  if (!rows.length) return null;
  try {
    const ids = JSON.parse(rows[0].participant_ids || '[]').map(String);
    return ids.includes(String(userId)) ? rows[0] : null;
  } catch {
    return null;
  }
}

// Presence is intentionally broadcast as a small public payload. Clients filter
// it to the people shown in their chat list, which avoids waiting for a polling
// interval before an online/away/offline change is reflected in the UI.
function emitPresenceUpdated(userId, presence) {
  if (ioInstance) {
    ioInstance.emit('presence_updated', { user_id: userId, ...presence });
  }
}

function emitNotification(userId, notification) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('new_notification', notification);
  }
}

module.exports = { initSocket, getIO, emitNewMessage, emitMessageEdited, emitMessageDeleted, emitPresenceUpdated, emitNotification };
