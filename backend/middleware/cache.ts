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
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Redis as RedisClient } from 'ioredis';
import { getRedis } from '../lib/redis';
import logger from '../lib/logger';

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
    const redis = getRedis();

    // Only cache GET; skip when Redis is unavailable
    if (req.method !== 'GET' || redis.isNoOp) {
      next();
      return;
    }

    const querySuffix =
      varyByQuery && Object.keys(req.query).length
        ? ':' + new URLSearchParams(req.query as Record<string, string>).toString()
        : '';
    // Anonymous requests share one bucket; authenticated users are isolated.
    const userSuffix = varyByUser && req.user?.id ? `:u:${req.user.id}` : '';
    const key = `cache:${prefix}${querySuffix}${userSuffix}`;
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
        (redis as RedisClient).setex(key, ttlSecs, JSON.stringify(data)).catch((err: Error) => {
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
 * Purge all cache keys for a given prefix (bare + common query-string variants).
 */
export async function invalidateCache(prefix: string): Promise<void> {
  const redis = getRedis();
  if (redis.isNoOp) return;
  try {
    const keys = [
      `cache:${prefix}`,
      `cache:${prefix}:feed=true&limit=30`,
      `cache:${prefix}:feed=true&limit=50`,
      `cache:${prefix}:sort=-created_at&limit=30`,
      `cache:${prefix}:sort=-created_at&limit=50`,
      `cache:${prefix}:sort=-like_count&limit=30`,
      `cache:${prefix}:limit=30`,
      `cache:${prefix}:limit=50`,
    ];
    await Promise.all(keys.map((k) => (redis as RedisClient).del(k).catch(() => undefined)));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Cache invalidation error');
  }
}

module.exports = { cacheMiddleware, invalidateCache };
