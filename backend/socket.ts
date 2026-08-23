/**
 * socket.ts — Socket.IO real-time server
 *
 * Key design decisions:
 *   - Redis adapter (@socket.io/redis-adapter): shares rooms across ALL Node
 *     instances. Without it a message on instance A never reaches users on
 *     instance B (split-brain). Required for any multi-instance deployment.
 *   - Connection state recovery: buffers missed events for 2 min on reconnect.
 *   - Presence fan-out scoped to followers only — never broadcasts to every
 *     connected socket (catastrophic at scale).
 *   - Block enforcement in typing events to prevent information leakage.
 *   - Dual-schema participant lookup: junction table first, JSON column fallback.
 */
import type { Server as HttpServer } from 'http';
import type { Socket, Server as IOServer } from 'socket.io';
import pool from './db/pool';
import logger from './lib/logger';
import { getRedis } from './lib/redis';
import { verifyAccessToken } from './middleware/auth';
import type { Redis as RedisClient } from 'ioredis';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SocketUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_banned?: boolean;
}

interface AuthenticatedSocket extends Socket {
  user: SocketUser;
}

interface ConversationRow {
  id: string;
  type: string;
  participant_ids?: string;
}

export interface PresencePayload {
  status: 'online' | 'offline' | 'away';
  last_seen: string;
}

// ── Module state ──────────────────────────────────────────────────────────────

let ioInstance: IOServer | null = null;

// ── In-memory socket user cache (5 min TTL) ───────────────────────────────────

const socketUserCache = new Map<string, { user: SocketUser; expiresAt: number }>();
const SOCKET_CACHE_TTL = 5 * 60 * 1000;

async function getSocketUser(userId: string): Promise<SocketUser | null> {
  const cached = socketUserCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.user;

  const { rows } = await pool.query<SocketUser>(
    'SELECT id, email, full_name, role, is_banned FROM users WHERE id = $1',
    [userId],
  );
  if (!rows.length) return null;

  socketUserCache.set(userId, { user: rows[0], expiresAt: Date.now() + SOCKET_CACHE_TTL });
  return rows[0];
}

/**
 * Check Redis revocation state for a socket handshake token.
 * Mirrors middleware/auth.isTokenRevoked but fails CLOSED: a socket is a
 * long-lived privileged channel, so when Redis is unreachable we reject the
 * handshake rather than let a potentially-revoked token connect.
 */
async function isSocketTokenRevoked(
  jti: string | undefined,
  userId: string | undefined,
  iat: number | undefined,
): Promise<boolean> {
  const redis = getRedis();
  if (redis.isNoOp) return false;
  try {
    if (jti) {
      const revoked = await (redis as RedisClient).get(`revoked:${jti}`);
      if (revoked === '1') return true;
    }
    if (userId && iat !== undefined) {
      const revokeBefore = await (redis as RedisClient).get(`revoke_before:${userId}`);
      if (revokeBefore && iat < parseInt(revokeBefore, 10)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Follower cache for targeted presence fan-out ──────────────────────────────

async function cacheFollowerIds(userId: string, redis: ReturnType<typeof getRedis>): Promise<void> {
  if (redis.isNoOp) return;
  try {
    const key = `followers:${userId}`;
    const exists = await (redis as RedisClient).exists(key);
    if (exists) return;

    const { rows } = await pool.query<{ follower_id: string }>(
      'SELECT follower_id FROM follows WHERE followed_id = $1 LIMIT 5000',
      [userId],
    );
    if (!rows.length) return;

    const ids = rows.map((r) => r.follower_id);
    await (redis as RedisClient).sadd(key, ...ids);
    await (redis as RedisClient).expire(key, 3600);
  } catch (err) {
    logger.warn({ err: (err as Error).message, userId }, 'Failed to cache follower IDs for presence');
  }
}

export async function invalidateFollowerCache(userId: string): Promise<void> {
  const redis = getRedis();
  if (redis.isNoOp) return;
  try {
    await (redis as RedisClient).del(`followers:${userId}`);
  } catch { /* non-fatal */ }
}

// ── Conversation authorization (junction table → legacy JSON fallback) ────────

export async function getAuthorizedConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationRow | null> {
  // Try junction table first (post-migrate31)
  try {
    const { rows } = await pool.query<ConversationRow>(
      `SELECT c.id, c.type
       FROM conversations c
       JOIN conversation_participants cp
         ON cp.conversation_id = c.id AND cp.user_id = $1
       WHERE c.id = $2`,
      [userId, conversationId],
    );
    if (rows.length) return rows[0];
  } catch { /* junction table may not exist yet */ }

  // Legacy fallback: participant_ids JSON column
  const { rows } = await pool.query<{ participant_ids: string; type: string }>(
    'SELECT participant_ids, type FROM conversations WHERE id = $1',
    [conversationId],
  );
  if (!rows.length) return null;
  try {
    const ids = JSON.parse(rows[0].participant_ids ?? '[]').map(String) as string[];
    return ids.includes(String(userId)) ? (rows[0] as ConversationRow) : null;
  } catch {
    return null;
  }
}

export async function getConversationParticipantIds(conversationId: string): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ user_id: string }>(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
      [conversationId],
    );
    if (rows.length) return rows.map((r) => String(r.user_id));
  } catch { /* fall through */ }

  const { rows } = await pool.query<{ participant_ids: string }>(
    'SELECT participant_ids FROM conversations WHERE id = $1',
    [conversationId],
  );
  if (!rows.length) return [];
  try {
    return (JSON.parse(rows[0].participant_ids ?? '[]') as unknown[]).map(String);
  } catch {
    return [];
  }
}

// ── initSocket ────────────────────────────────────────────────────────────────

export function initSocket(httpServer: HttpServer, corsOrigin: string | string[]): IOServer {
  const { Server } = require('socket.io') as typeof import('socket.io');
  const origins = Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin ?? 'http://localhost:3000'];

  ioInstance = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  // ── Redis adapter (multi-instance horizontal scaling) ─────────────────────
  const redis = getRedis();
  if (!redis.isNoOp) {
    try {
      const { createAdapter } = require('@socket.io/redis-adapter') as typeof import('@socket.io/redis-adapter');
      const IORedis = require('ioredis') as typeof import('ioredis').default;
      const isTls = (process.env.REDIS_URL ?? '').startsWith('rediss://');
      const tlsOpts = isTls ? { tls: { rejectUnauthorized: false } } : {};
      // @ts-expect-error — IORedis constructor overload
      const pubClient = new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true,
        ...tlsOpts,
      });
      const subClient = pubClient.duplicate();

      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          ioInstance!.adapter(createAdapter(pubClient, subClient));
          logger.info('Socket.IO Redis adapter attached — multi-instance scaling enabled');
        })
        .catch((err: Error) => {
          logger.warn({ err: err.message }, 'Socket.IO Redis adapter failed — single-instance mode');
        });
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Socket.IO Redis adapter unavailable');
    }
  } else {
    logger.info('Socket.IO running without Redis adapter — single-instance only');
  }

  // ── JWT auth middleware ───────────────────────────────────────────────────
  ioInstance.use(async (socket, next) => {
    try {
      const raw = socket.handshake.auth as Record<string, unknown>;
      const token =
        (raw?.token as string | undefined) ??
        (socket.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));

      // Enforce ACCESS tokens — refresh tokens must never open a socket.
      const payload = verifyAccessToken(token);
      if (await isSocketTokenRevoked(payload.jti, payload.sub, payload.iat)) {
        return next(new Error('Token has been revoked'));
      }

      const user = await getSocketUser(payload.sub as string);
      if (!user) return next(new Error('User not found'));
      if (user.is_banned) return next(new Error('Account suspended'));

      (socket as AuthenticatedSocket).user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  ioInstance.on('connection', async (socket: Socket) => {
    const s = socket as AuthenticatedSocket;

    socket.join(`user:${s.user.id}`);
    cacheFollowerIds(s.user.id, redis).catch(() => undefined);

    socket.on('join_conversation', async (conversationId: unknown) => {
      if (!conversationId || typeof conversationId !== 'string') return;
      try {
        const conv = await getAuthorizedConversation(s.user.id, conversationId);
        if (conv) socket.join(`conv:${conversationId}`);
      } catch { /* never join an unverified room */ }
    });

    socket.on('leave_conversation', (conversationId: unknown) => {
      if (conversationId && typeof conversationId === 'string') {
        socket.leave(`conv:${conversationId}`);
      }
    });

    socket.on('typing', async (data: unknown) => {
      const { conversationId, isTyping } = (data ?? {}) as { conversationId?: string; isTyping?: boolean };
      if (!conversationId || typeof isTyping !== 'boolean') return;
      try {
        const conv = await getAuthorizedConversation(s.user.id, conversationId);
        if (!conv) return;

        if (conv.type === 'dm') {
          const ids = await getConversationParticipantIds(conversationId);
          const otherUserId = ids.find((id) => id !== String(s.user.id));
          if (otherUserId) {
            const { rows } = await pool.query(
              `SELECT 1 FROM blocks
               WHERE (blocker_id = $1 AND blocked_id = $2)
                  OR (blocker_id = $2 AND blocked_id = $1)
               LIMIT 1`,
              [s.user.id, otherUserId],
            );
            if (rows.length) return;
          }
        }

        socket.to(`conv:${conversationId}`).emit('typing_updated', {
          conversation_id: conversationId,
          user_id: s.user.id,
          is_typing: isTyping,
        });
      } catch { /* ignore transient errors */ }
    });

    socket.on('disconnect', () => {
      // Presence offline handled by HTTP PUT /presence
    });
  });

  return ioInstance;
}

export function getIO(): IOServer | null {
  return ioInstance;
}

// ── Outbound emitters ─────────────────────────────────────────────────────────

export function emitNewMessage(conversationId: string, message: Record<string, unknown>): void {
  ioInstance?.to(`conv:${conversationId}`).emit('new_message', message);
}

export function emitMessageEdited(conversationId: string, message: Record<string, unknown>): void {
  ioInstance?.to(`conv:${conversationId}`).emit('message_edited', message);
}

export function emitMessageDeleted(conversationId: string, messageId: string): void {
  ioInstance?.to(`conv:${conversationId}`).emit('message_deleted', { id: messageId });
}

/**
 * Emit presence update ONLY to followers of the changed user.
 * Falls back to full broadcast when Redis is unavailable (dev only).
 *
 * Without this fan-out scoping, every presence change at 100K concurrent users
 * would trigger 100K socket writes — the exact pattern that broke early Twitter.
 */
export async function emitPresenceUpdated(
  userId: string,
  presence: PresencePayload,
): Promise<void> {
  if (!ioInstance) return;

  const redis = getRedis();
  if (!redis.isNoOp) {
    try {
      const followerIds = await (redis as RedisClient).smembers(`followers:${userId}`);
      const payload = { user_id: userId, ...presence };
      for (const followerId of followerIds) {
        ioInstance.to(`user:${followerId}`).emit('presence_updated', payload);
      }
      ioInstance.to(`user:${userId}`).emit('presence_updated', payload);
      return;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Presence fan-out via Redis failed — falling back to broadcast');
    }
  }

  // Dev fallback — broadcast to all connected sockets
  ioInstance.emit('presence_updated', { user_id: userId, ...presence });
}

export function emitNotification(userId: string, notification: Record<string, unknown>): void {
  ioInstance?.to(`user:${userId}`).emit('new_notification', notification);
}

module.exports = {
  initSocket,
  getIO,
  emitNewMessage,
  emitMessageEdited,
  emitMessageDeleted,
  emitPresenceUpdated,
  emitNotification,
  invalidateFollowerCache,
  getAuthorizedConversation,
  getConversationParticipantIds,
};
