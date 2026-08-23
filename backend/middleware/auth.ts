/**
 * middleware/auth.ts — JWT authentication middleware
 *
 * - requireAuth:          verifies Bearer JWT, checks Redis revocation, attaches req.user
 * - optionalAuth:         same but does not reject on missing/invalid token
 * - requireAdmin:         enforces role === 'admin' after requireAuth
 * - invalidateUserCache:  evict a user from the 60s Redis cache (call on ban/unban/role-change)
 *
 * Performance: getCachedUser() caches the DB SELECT for 60 seconds in Redis.
 * At 10K req/s this eliminates ~10K extra DB queries per second just for auth.
 */
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { getRedis } from '../lib/redis';
import logger from '../lib/logger';
import type { AuthUser } from '../lib/types';
import type { Redis as RedisClient } from 'ioredis';

const USER_CACHE_TTL = 60; // seconds

// ── User cache ────────────────────────────────────────────────────────────────

async function getCachedUser(userId: string): Promise<AuthUser | null> {
  const redis = getRedis();

  if (!redis.isNoOp) {
    try {
      const cached = await (redis as RedisClient).get(`user:${userId}`);
      if (cached) return JSON.parse(cached) as AuthUser;
    } catch (err) {
      logger.warn({ err: (err as Error).message, userId }, 'auth: Redis user cache read failed');
    }
  }

  const { rows } = await pool.query<AuthUser>(
    'SELECT id, email, role, is_banned FROM users WHERE id = $1',
    [userId],
  );
  const user = rows[0] ?? null;

  if (user && !redis.isNoOp) {
    (redis as RedisClient)
      .setex(`user:${userId}`, USER_CACHE_TTL, JSON.stringify(user))
      .catch((err: Error) =>
        logger.warn({ err: err.message, userId }, 'auth: Redis user cache write failed'),
      );
  }

  return user;
}

export async function invalidateUserCache(userId: string): Promise<void> {
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

    if (await isTokenRevoked(payload.jti, payload.sub, payload.iat)) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    const user = await getCachedUser(payload.sub as string);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    if (user.is_banned) {
      res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
      return;
    }

    req.user = user;
    next();
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
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = await getCachedUser(payload.sub as string);
  } catch {
    req.user = null;
  }
  next();
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
