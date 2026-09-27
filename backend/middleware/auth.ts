/**
 * middleware/auth.ts — JWT authentication middleware
 *
 * - requireAuth:          verifies Bearer JWT, checks Redis revocation, attaches req.user
 * - optionalAuth:         same but does not reject on missing/invalid token
 * - requireAdmin:         enforces role === 'admin' after requireAuth
 * - invalidateUserCache:  evict a user from the 60s Redis cache (call on ban/unban/role-change)
 *
 * Performance: getCachedUser() uses a two-layer cache:
 *   1. In-process Map (30s TTL) — zero Redis commands for repeat requests within the same pod
 *   2. Redis (60s TTL) — shared across pods, eliminates DB queries
 * At 10K req/s this eliminates the vast majority of Redis + DB round-trips for auth.
 *
 * Similarly, isTokenRevoked() uses an in-process negative cache (10s TTL) so
 * the "is this token revoked?" Redis round-trip only happens at most once per
 * 10 seconds per unique JTI, not on every single request.
 */
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { getRedis, withoutRedis } from '../lib/redis';
import logger from '../lib/logger';
import type { AuthUser } from '../lib/types';
import type { Redis as RedisClient } from 'ioredis';

const USER_CACHE_TTL = 60;         // Redis TTL in seconds
const USER_LOCAL_TTL = 30_000;     // In-process TTL in ms (30s)
const REVOKE_LOCAL_TTL = 10_000;   // In-process negative-cache TTL in ms (10s)

// ── In-process caches (per pod, no Redis commands) ────────────────────────────

interface LocalEntry<T> { value: T; expiresAt: number; }

// user cache: userId → AuthUser
const localUserCache = new Map<string, LocalEntry<AuthUser | null>>();
// revocation negative cache: jti → boolean (false = not revoked, confirmed within last 10s)
const localRevocationCache = new Map<string, LocalEntry<boolean>>();

function localGet<T>(map: Map<string, LocalEntry<T>>, key: string): T | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { map.delete(key); return undefined; }
  return entry.value;
}

function localSet<T>(map: Map<string, LocalEntry<T>>, key: string, value: T, ttlMs: number): void {
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
  // Evict if the map grows too large (safety cap at 5 000 entries)
  if (map.size > 5_000) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
}

// ── User cache ────────────────────────────────────────────────────────────────

async function getCachedUser(userId: string, demoAccount = false): Promise<AuthUser | null> {
  // 1. In-process cache (no Redis round-trip)
  const localHit = localGet(localUserCache, userId);
  if (localHit !== undefined) return localHit;

  const redis = demoAccount ? null : getRedis();

  // 2. Redis cache
  if (redis && !redis.isNoOp) {
    try {
      const cached = await (redis as RedisClient).get(`user:${userId}`);
      if (cached) {
        const user = JSON.parse(cached) as AuthUser;
        localSet(localUserCache, userId, user, USER_LOCAL_TTL);
        return user;
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, userId }, 'auth: Redis user cache read failed');
    }
  }

  // 3. Database
  const { rows } = await pool.query<AuthUser>(
    'SELECT id, email, role, is_banned, (is_demo OR is_seed) AS is_demo FROM users WHERE id = $1',
    [userId],
  );
  const user = rows[0] ?? null;

  localSet(localUserCache, userId, user, USER_LOCAL_TTL);

  if (user && !user.is_demo && redis && !redis.isNoOp) {
    (redis as RedisClient)
      .setex(`user:${userId}`, USER_CACHE_TTL, JSON.stringify(user))
      .catch((err: Error) =>
        logger.warn({ err: err.message, userId }, 'auth: Redis user cache write failed'),
      );
  }

  return user;
}

export async function invalidateUserCache(userId: string): Promise<void> {
  // Always evict from in-process cache immediately
  localUserCache.delete(userId);

  const redis = getRedis();
  if (redis.isNoOp) return;
  try {
    await (redis as RedisClient).del(`user:${userId}`);
    logger.debug({ userId }, 'auth: user cache evicted');
  } catch (err) {
    logger.warn({ err: (err as Error).message, userId }, 'auth: user cache eviction failed');
  }
}

// ── JWT revocation check ──────────────────────────────────────────────────────

async function isTokenRevoked(
  jti: string | undefined,
  userId: string | undefined,
  iat: number | undefined,
): Promise<boolean> {
  // In-process negative cache: if we confirmed this JTI is NOT revoked within
  // the last 10s, skip the Redis round-trip entirely.
  if (jti) {
    const localResult = localGet(localRevocationCache, jti);
    if (localResult !== undefined) return localResult; // cached answer (true or false)
  }

  const redis = getRedis();
  if (redis.isNoOp) return false;
  try {
    if (jti) {
      const revoked = await (redis as RedisClient).get(`revoked:${jti}`);
      if (revoked === '1') {
        localSet(localRevocationCache, jti, true, REVOKE_LOCAL_TTL);
        return true;
      }
    }
    if (userId && iat !== undefined) {
      const revokeBefore = await (redis as RedisClient).get(`revoke_before:${userId}`);
      if (revokeBefore && iat < parseInt(revokeBefore, 10)) {
        if (jti) localSet(localRevocationCache, jti, true, REVOKE_LOCAL_TTL);
        return true;
      }
    }
    // Not revoked — cache the negative result so we skip Redis for the next 10s
    if (jti) localSet(localRevocationCache, jti, false, REVOKE_LOCAL_TTL);
    return false;
  } catch {
    return false; // fail open — never block a request because Redis is down
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Verify a Bearer JWT and enforce that it is an ACCESS token.
 *
 * Security: refresh tokens carry type='refresh' and live for 7 days. They are
 * only ever sent by browsers inside the HttpOnly /api/auth cookie. Accepting
 * them as Bearer credentials would turn a leaked refresh cookie into a
 * week-long session, defeating the 15-minute access-token design.
 */
function verifyAccessToken(token: string): jwt.JwtPayload {
  const payload = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
  if (payload.type !== 'access') {
    throw new jwt.JsonWebTokenError('invalid token type');
  }
  return payload;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = verifyAccessToken(header.slice(7));

    if (payload.demo !== true && await isTokenRevoked(payload.jti, payload.sub, payload.iat)) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    const user = await getCachedUser(payload.sub as string, payload.demo === true);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    if (user.is_banned) {
      res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
      return;
    }

    req.user = user;
    if (user.is_demo) withoutRedis(next);
    else next();
  } catch (err) {
    if ((err as Error).name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    req.user = null;
    withoutRedis(next);
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    if (payload.demo !== true && await isTokenRevoked(payload.jti, payload.sub, payload.iat)) {
      req.user = null;
      withoutRedis(next);
      return;
    }
    const user = await getCachedUser(payload.sub as string, payload.demo === true);
    req.user = user && !user.is_banned ? user : null;
    if (!req.user?.is_demo) {
      next();
      return;
    }
  } catch {
    req.user = null;
  }
  if (req.user?.is_demo || !req.user) withoutRedis(next);
  else next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export { verifyAccessToken };

module.exports = { requireAuth, optionalAuth, requireAdmin, invalidateUserCache, verifyAccessToken };
