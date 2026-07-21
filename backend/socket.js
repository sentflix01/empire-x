const jwt = require('jsonwebtoken');
const pool = require('./db/pool');

let ioInstance = null;

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
      const { rows } = await pool.query('SELECT id, email, full_name, role FROM users WHERE id = $1', [payload.sub]);
      if (!rows.length) return next(new Error('User not found'));
      socket.user = rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    // Join personal user room so we can push notifications to this user
    socket.join(`user:${socket.user.id}`);

    socket.on('join_conversation', (conversationId) => {
      if (conversationId) socket.join(`conv:${conversationId}`);
    });
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) socket.leave(`conv:${conversationId}`);
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

function emitNotification(userId, notification) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('new_notification', notification);
  }
}

module.exports = { initSocket, getIO, emitNewMessage, emitMessageEdited, emitMessageDeleted, emitNotification };
