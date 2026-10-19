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
import pool, { runWithDatabaseEnvironment, type DatabaseContext } from './db/pool';
import logger from './lib/logger';
import { getRedis } from './lib/redis';
import { verifyAccessToken } from './middleware/auth';
import { DEMO_SESSION_COOKIE, resolveDemoSession } from './middleware/demoEnvironment';
import type { Redis as RedisClient } from 'ioredis';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SocketUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_banned?: boolean;
  is_demo: boolean;
}

interface AuthenticatedSocket extends Socket {
  user: SocketUser;
  /** Set for demo sessions: every query for this socket runs against the demo database. */
  dbContext?: DatabaseContext;
}

/** Run a handler in the socket's database (demo sessions use the isolated demo database). */
function inSocketDb<T>(s: AuthenticatedSocket, fn: () => Promise<T>): Promise<T> {
  return s.dbContext ? runWithDatabaseEnvironment(s.dbContext, fn) : fn();
}

function cookieValue(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) { try { return decodeURIComponent(v.join('=')); } catch { return undefined; } }
  }
  return undefined;
}

/** One typing event per person and chat every few seconds is plenty. */
const TYPING_INTERVAL_MS = 3000;
const lastTyping = new Map<string, { at: number; isTyping: boolean }>();

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
    'SELECT id, email, full_name, role, is_banned, (is_demo OR is_seed) AS is_demo FROM users WHERE id = $1',
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
  isDemo = false,
): Promise<boolean> {
  if (isDemo) return false;
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
    // Fail CLOSED: a socket is a long-lived privileged channel, so when
    // Redis is unreachable we reject the handshake rather than let a
    // potentially-revoked token connect.
    return true;
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
  const origins = Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin ?? 'http://localhost:3002'];

  ioInstance = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      // A recovered connection is checked again (ban, revoked token).
      skipMiddlewares: false,
    },
  });

  // ── Redis adapter (multi-instance horizontal scaling) ─────────────────────
  // Enable explicitly only when this deployment has multiple backend instances.
  if (process.env.ENABLE_SOCKET_REDIS_ADAPTER === 'true') {
    const redis = getRedis();
    if (redis.isNoOp) {
      logger.info('Socket.IO running without Redis adapter — Redis unavailable');
    } else {
      try {
      const { createAdapter } = require('@socket.io/redis-adapter') as typeof import('@socket.io/redis-adapter');
      const IORedis = require('ioredis') as typeof import('ioredis').default;
      const isTls = (process.env.REDIS_URL ?? '').startsWith('rediss://');
      const tlsOpts = isTls ? { tls: { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED === 'false' ? false : true } } : {};
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
    }
  } else {
    logger.info('Socket.IO running without Redis adapter — single-instance mode');
  }

  // ── JWT auth middleware ───────────────────────────────────────────────────
  ioInstance.use(async (socket, next) => {
    try {
      const raw = socket.handshake.auth as Record<string, unknown>;
      const token =
        (raw?.token as string | undefined) ??
        (socket.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));

      // A demo session (cookie) signs its own access tokens and lives in the demo database.
      const demo = await resolveDemoSession(cookieValue(socket.handshake.headers?.cookie, DEMO_SESSION_COOKIE));
      // Enforce ACCESS tokens — refresh tokens must never open a socket.
      const payload = verifyAccessToken(token, demo ?? undefined);
      if (!demo && await isSocketTokenRevoked(payload.jti, payload.sub, payload.iat, payload.demo === true)) {
        return next(new Error('Token has been revoked'));
      }
      const s = socket as AuthenticatedSocket;
      if (demo) s.dbContext = { environment: 'demo', demoSessionId: demo.id, demoUserId: demo.userId };

      const user = await inSocketDb(s, () => getSocketUser(payload.sub as string));
      if (!user) return next(new Error('User not found'));
      if (user.is_banned) return next(new Error('Account suspended'));

      s.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  ioInstance.on('connection', async (socket: Socket) => {
    const s = socket as AuthenticatedSocket;

    socket.join(`user:${s.user.id}`);
    if (!s.user.is_demo) cacheFollowerIds(s.user.id, getRedis()).catch(() => undefined);

    socket.on('join_conversation', async (conversationId: unknown) => {
      if (!conversationId || typeof conversationId !== 'string') return;
      try {
        const conv = await inSocketDb(s, () => getAuthorizedConversation(s.user.id, conversationId));
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
      if (!conversationId || typeof conversationId !== 'string' || typeof isTyping !== 'boolean') return;
      // Throttle "is typing" repeats; "stopped typing" always goes through.
      const key = `${s.user.id}:${conversationId}`;
      const prev = lastTyping.get(key);
      if (isTyping && prev?.isTyping && Date.now() - prev.at < TYPING_INTERVAL_MS) return;
      lastTyping.set(key, { at: Date.now(), isTyping });
      if (lastTyping.size > 20_000) lastTyping.delete(lastTyping.keys().next().value as string);
      try {
        const allowed = await inSocketDb(s, async () => {
          const conv = await getAuthorizedConversation(s.user.id, conversationId);
          if (!conv) return false;
          if (conv.type !== 'dm') return true;
          const ids = await getConversationParticipantIds(conversationId);
          const otherUserId = ids.find((id) => id !== String(s.user.id));
          if (!otherUserId) return true;
          const { rows } = await pool.query(
            `SELECT 1 FROM blocks
             WHERE (blocker_id = $1 AND blocked_id = $2)
                OR (blocker_id = $2 AND blocked_id = $1)
             LIMIT 1`,
            [s.user.id, otherUserId],
          );
          return rows.length === 0;
        });
        if (!allowed) return;

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

    // ── Live location tracking room (Enterprise tier) ─────────────────────
    socket.on('join_business_tracking', async (businessId: unknown) => {
      if (!businessId || typeof businessId !== 'string') return;
      try {
        // Verify the business has pro tier before allowing join
        const { rows } = await inSocketDb(s, () => pool.query(
          `SELECT tier FROM business_subscriptions WHERE business_id = $1`,
          [businessId],
        ));
        const tier = rows[0]?.tier ?? 'freemium';
        if (tier === 'pro') {
          socket.join(`business:${businessId}:tracking`);
        }
      } catch { /* non-fatal — deny silently */ }
    });

    socket.on('leave_business_tracking', (businessId: unknown) => {
      if (businessId && typeof businessId === 'string') {
        socket.leave(`business:${businessId}:tracking`);
      }
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

  // No Redis (the production default) — read followers from the database
  // instead of broadcasting one user's status to every connected socket.
  const payload = { user_id: userId, ...presence };
  try {
    const { rows } = await pool.query<{ follower_id: string }>(
      'SELECT follower_id FROM follows WHERE followed_id = $1 LIMIT 5000',
      [userId],
    );
    for (const { follower_id } of rows) ioInstance.to(`user:${follower_id}`).emit('presence_updated', payload);
  } catch (err) {
    logger.warn({ err: (err as Error).message, userId }, 'Presence fan-out via database failed');
  }
  ioInstance.to(`user:${userId}`).emit('presence_updated', payload);
}

/** An event for one person on all their devices (chat list, unread badge, read receipts). */
export function emitToUser(userId: string, event: string, payload: Record<string, unknown>): void {
  ioInstance?.to(`user:${userId}`).emit(event, payload);
}

export function emitNotification(userId: string, notification: Record<string, unknown>): void {
  ioInstance?.to(`user:${userId}`).emit('new_notification', notification);
}

/**
 * Forcefully disconnect all active sockets for a user.
 *
 * Called immediately after a ban so the user loses their socket session
 * without waiting for the 5-minute in-memory socket-user-cache TTL to expire.
 * The `user:{userId}` room is joined by every socket belonging to that user on
 * connect, so emitting `force_disconnect` there reaches all their tabs/devices.
 */
export function forceDisconnectUser(userId: string): void {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit('force_disconnect', { reason: 'account_suspended' });
  // Also evict the in-memory socket user cache entry so any socket that
  // processes an event before disconnecting re-fetches the banned state.
  socketUserCache.delete(userId);
  // Close every socket for real instead of relying on the client to comply.
  ioInstance.in(`user:${userId}`).disconnectSockets(true);
}

/** Someone left or was removed: stop sending them that chat's live events. */
export function removeUserFromConversationRoom(userId: string, conversationId: string): void {
  ioInstance?.in(`user:${userId}`).socketsLeave(`conv:${conversationId}`);
}

module.exports = {
  initSocket,
  getIO,
  emitNewMessage,
  emitMessageEdited,
  emitMessageDeleted,
  emitPresenceUpdated,
  emitNotification,
  emitToUser,
  forceDisconnectUser,
  removeUserFromConversationRoom,
  invalidateFollowerCache,
  getAuthorizedConversation,
  getConversationParticipantIds,
};
