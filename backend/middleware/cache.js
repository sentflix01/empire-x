/**
 * cache.js — Express middleware for Redis-backed HTTP response caching.
 *
 * Usage:
 *   router.get('/', cacheMiddleware('posts:list', 60), handler)
 *
 * - Returns cached JSON response immediately (no DB hit)
 * - Falls through to handler on cache miss, then stores result
 * - Automatically bypasses cache for authenticated write-heavy routes
 * - Cache key includes query string for correct per-filter caching
 */
const { getRedis } = require('../lib/redis');
const logger = require('../lib/logger');

/**
 * @param {string} prefix    Cache key prefix (e.g. 'posts:list')
 * @param {number} ttlSecs   TTL in seconds (default 30)
 * @param {object} opts
 *   @param {boolean} opts.varyByUser  If true, include user ID in key (for personal feeds)
 *   @param {boolean} opts.varyByQuery If true (default), include query string in key
 */
function cacheMiddleware(prefix, ttlSecs = 30, opts = {}) {
  const { varyByUser = false, varyByQuery = true } = opts;

  return async (req, res, next) => {
    const redis = getRedis();

    // Skip cache for non-GET or when Redis is unavailable
    if (req.method !== 'GET' || redis.isNoOp) return next();

    // Build cache key
    const querySuffix = varyByQuery && Object.keys(req.query).length
      ? ':' + new URLSearchParams(req.query).toString()
      : '';
    const userSuffix = varyByUser && req.user?.id ? `:u:${req.user.id}` : '';
    const key = `cache:${prefix}${querySuffix}${userSuffix}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', `public, max-age=${Math.floor(ttlSecs / 2)}, stale-while-revalidate=${ttlSecs}`);
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Cache read error — bypassing');
    }

    // Cache miss — intercept res.json to store result
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis.setex(key, ttlSecs, JSON.stringify(data)).catch(err => {
          logger.warn({ err: err.message, key }, 'Cache write error');
        });
      }
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', `public, max-age=${Math.floor(ttlSecs / 2)}, stale-while-revalidate=${ttlSecs}`);
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate all cache keys for a given prefix.
 * Deletes both the bare key and the most common param variants
 * used by posts:list, products:list, etc.
 *
 * @param {string} prefix  e.g. 'posts:list'
 */
async function invalidateCache(prefix) {
  const redis = getRedis();
  if (redis.isNoOp) return;
  try {
    // Delete bare key + common feed param variants
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
    await Promise.all(keys.map(k => redis.del(k).catch(() => {})));
  } catch (err) {
    logger.warn({ err: err.message }, 'Cache invalidation error');
  }
}

module.exports = { cacheMiddleware, invalidateCache };
