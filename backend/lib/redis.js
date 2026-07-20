/**
 * redis.js — Redis connection via ioredis
 *
 * Used for:
 *   - Session/OTP caching
 *   - Rate limiting (fast counters)
 *   - Feed + profile caching
 *   - BullMQ queue backend
 *   - Chat presence (online/offline)
 *   - Feature flags
 *
 * Set REDIS_URL in .env (defaults to local Redis for dev).
 * If Redis is not configured, returns a no-op client that logs warnings.
 */
const logger = require('./logger');

let redis = null;
let isConnected = false;

function getRedis() {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('REDIS_URL not set — caching and queues disabled');
    } else {
      logger.debug('REDIS_URL not set — using no-op Redis stub (dev only)');
    }
    // Return a no-op stub so the app doesn't crash without Redis
    redis = createNoOpRedis();
    return redis;
  }

  try {
    const IORedis = require('ioredis');
    // Upstash and other TLS Redis providers use rediss:// — ioredis needs
    // tls option explicitly set to handle self-signed / managed certs properly.
    const isTls = redisUrl.startsWith('rediss://');
    redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    });

    redis.on('connect', () => {
      isConnected = true;
      logger.info('Redis connected');
    });
    redis.on('error', (err) => {
      logger.error({ err: err.message }, 'Redis error');
    });
    redis.on('close', () => {
      isConnected = false;
    });

    redis.connect().catch(err => {
      logger.warn({ err: err.message }, 'Redis connection failed — continuing without Redis');
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'ioredis not available — using no-op stub');
    redis = createNoOpRedis();
  }

  return redis;
}

/**
 * No-op Redis stub — silently ignores all operations.
 * Lets the app run without Redis in dev/test environments.
 */
function createNoOpRedis() {
  const noop = async () => null;
  return {
    get: noop,
    set: noop,
    setex: noop,
    del: noop,
    incr: noop,
    expire: noop,
    exists: noop,
    hget: noop,
    hset: noop,
    hdel: noop,
    hgetall: noop,
    lpush: noop,
    lrange: noop,
    publish: noop,
    subscribe: noop,
    quit: noop,
    disconnect: noop,
    isNoOp: true,
    status: 'noop',
  };
}

/**
 * Cache helper — get or compute a value with TTL
 *
 * @param {string} key      Cache key
 * @param {number} ttl      Seconds to cache
 * @param {Function} fn     Async function to compute value if cache miss
 */
async function cached(key, ttl, fn) {
  const client = getRedis();
  if (client.isNoOp) return fn();

  try {
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached);

    const value = await fn();
    if (value != null) {
      await client.setex(key, ttl, JSON.stringify(value));
    }
    return value;
  } catch (err) {
    logger.warn({ err: err.message, key }, 'Cache error — falling back to DB');
    return fn();
  }
}

/**
 * Invalidate cache keys matching a pattern prefix
 */
async function invalidate(keyPrefix) {
  const client = getRedis();
  if (client.isNoOp) return;
  try {
    await client.del(keyPrefix);
  } catch (err) {
    logger.warn({ err: err.message }, 'Cache invalidation failed');
  }
}

module.exports = { getRedis, cached, invalidate };
