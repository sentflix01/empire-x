/**
 * middleware/cache.ts — Redis-backed HTTP response caching
 *
 * Usage:
 *   router.get('/', cacheMiddleware('posts:list', 60), handler)
 *
 * - Returns cached JSON immediately on HIT (no DB query)
 * - On MISS: intercepts res.json to store the result, then serves it
 * - Skips caching for non-GET requests and when Redis is unavailable
 * - Sets X-Cache: HIT/MISS and Cache-Control headers
 *
 * invalidateCache() tracks which full keys have been written and only
 * deletes those — instead of unconditionally firing 8 DEL commands per
 * mutation regardless of whether the keys exist.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Redis as RedisClient } from 'ioredis';
import { getRedis } from '../lib/redis';
import logger from '../lib/logger';

// ── Live key registry ─────────────────────────────────────────────────────────
// Tracks every full cache key that has been successfully written to Redis.
// invalidateCache() consults this set instead of deleting a hardcoded list of
// guessed variants — saves ~7 wasted DEL commands per write mutation.
// Keys are stored without a TTL cap; they are evicted when the value is deleted
// or when the process restarts (both are fine — worst case we miss one DEL).
const _liveKeys = new Map<string, Set<string>>(); // prefix → Set<fullKey>

function registerKey(prefix: string, fullKey: string): void {
  let set = _liveKeys.get(prefix);
  if (!set) { set = new Set(); _liveKeys.set(prefix, set); }
  set.add(fullKey);
  // Safety cap: keep at most 500 keys per prefix to avoid unbounded growth
  if (set.size > 500) {
    const oldest = set.values().next().value;
    if (oldest !== undefined) set.delete(oldest);
  }
}

function deregisterKey(prefix: string, fullKey: string): void {
  _liveKeys.get(prefix)?.delete(fullKey);
}

export interface CacheOptions {
  varyByUser?: boolean;   // include user ID in cache key
  varyByQuery?: boolean;  // include query string in cache key (default true)
}

/**
 * Express middleware that caches JSON responses in Redis.
 *
 * @param prefix    Cache key prefix, e.g. 'posts:list'
 * @param ttlSecs   Time-to-live in seconds (default 30)
 * @param opts      { varyByUser, varyByQuery }
 */
export function cacheMiddleware(
  prefix: string,
  ttlSecs = 30,
  opts: CacheOptions = {},
): RequestHandler {
  const { varyByUser = false, varyByQuery = true } = opts;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // The same authenticated user can switch Real mode on/off. Both shared
    // Redis and intermediary HTTP caches must keep those result sets separate.
    res.vary('X-Real-Only');
    // Browser caches must also partition personalized responses. The server-side
    // Redis key is not visible to the browser and cannot protect account switches.
    if (varyByUser) {
      res.vary('Authorization');
      res.vary('Cookie');
    }
    // Guests and demo accounts are served directly from PostgreSQL; only real
    // signed-in users use the shared Redis response cache.
    if (req.method !== 'GET' || !req.user || req.user.is_demo) {
      next();
      return;
    }

    const redis = getRedis();
    if (redis.isNoOp) { next(); return; }

    const querySuffix =
      varyByQuery && Object.keys(req.query).length
        ? ':' + new URLSearchParams(req.query as Record<string, string>).toString()
        : '';
    // Anonymous requests share one bucket; authenticated users are isolated.
    const userSuffix = varyByUser && req.user?.id ? `:u:${req.user.id}` : '';
    const modeSuffix = req.realOnly ? ':real-only' : ':all-users';
    const key = `cache:${prefix}${querySuffix}${userSuffix}${modeSuffix}`;
    // Personalized responses must never be stored by shared caches/CDNs.
    const cacheControl = varyByUser
      ? `private, max-age=${Math.floor(ttlSecs / 2)}, stale-while-revalidate=${ttlSecs}`
      : `public, max-age=${Math.floor(ttlSecs / 2)}, stale-while-revalidate=${ttlSecs}`;

    try {
      const hit = await (redis as RedisClient).get(key);
      if (hit) {
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', cacheControl);
        res.json(JSON.parse(hit));
        return;
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'Cache read error — bypassing');
    }

    // MISS — monkey-patch res.json to store the response
    const originalJson = res.json.bind(res);
    res.json = (data: unknown): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        (redis as RedisClient).setex(key, ttlSecs, JSON.stringify(data))
          .then(() => {
            // Register this key so invalidateCache() knows it exists
            registerKey(prefix, key);
          })
          .catch((err: Error) => {
            logger.warn({ err: err.message, key }, 'Cache write error');
          });
      }
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', cacheControl);
      return originalJson(data);
    };

    next();
  };
}

/**
 * Purge cache keys for a given prefix.
 *
 * Only deletes keys that have actually been written by cacheMiddleware on this
 * pod (tracked in _liveKeys). This replaces the old approach of unconditionally
 * firing 8 DEL commands per mutation — most of which targeted keys that never
 * existed, wasting Upstash quota.
 *
 * On the very first call after a cold start, _liveKeys will be empty and
 * nothing is deleted. That's correct: if no keys were written, there's nothing
 * to invalidate. Subsequent mutations after at least one cache-warming GET will
 * accurately delete only the live keys.
 */
export async function invalidateCache(prefix: string): Promise<void> {
  const redis = getRedis();
  if (redis.isNoOp) return;

  const liveSet = _liveKeys.get(prefix);
  if (!liveSet || liveSet.size === 0) return; // nothing to delete

  const keys = Array.from(liveSet);
  try {
    await Promise.all(
      keys.map((k) =>
        (redis as RedisClient).del(k)
          .then(() => deregisterKey(prefix, k))
          .catch(() => undefined),
      ),
    );
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Cache invalidation error');
  }
}

module.exports = { cacheMiddleware, invalidateCache };
