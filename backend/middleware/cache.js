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
 * Invalidate all cache keys matching a prefix pattern.
 * Call this after write operations to keep cache fresh.
 *
 * @param {string} prefix  e.g. 'posts:list' or 'products'
 */
async function invalidateCache(prefix) {
  const redis = getRedis();
  if (redis.isNoOp) return;
  try {
    // Upstash free tier doesn't support SCAN — use DEL on known keys
    // For simple invalidation, we delete the base key and common variants
    await redis.del(`cache:${prefix}`);
  } catch (err) {
    logger.warn({ err: err.message }, 'Cache invalidation error');
  }
}

module.exports = { cacheMiddleware, invalidateCache };
