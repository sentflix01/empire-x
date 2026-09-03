/**
 * lib/redis.ts — Redis connection via ioredis
 *
 * Used for: JWT revocation, user auth cache, feed/profile caching,
 * BullMQ queues, chat presence, feature flags.
 *
 * Set REDIS_URL in .env (rediss:// for TLS/Upstash).
 * If Redis is not configured, returns a no-op client that logs warnings —
 * the app runs fully without Redis in development.
 */
import type { Redis as RedisClient } from 'ioredis';
import logger from './logger';

// ── No-op stub type ───────────────────────────────────────────────────────────
type NoOpRedis = {
  readonly isNoOp: true;
  readonly status: 'noop';
  get: (...args: unknown[]) => Promise<null>;
  set: (...args: unknown[]) => Promise<null>;
  setex: (...args: unknown[]) => Promise<null>;
  del: (...args: unknown[]) => Promise<null>;
  incr: (...args: unknown[]) => Promise<null>;
  expire: (...args: unknown[]) => Promise<null>;
  exists: (...args: unknown[]) => Promise<null>;
  smembers: (...args: unknown[]) => Promise<never[]>;
  sadd: (...args: unknown[]) => Promise<null>;
  hget: (...args: unknown[]) => Promise<null>;
  hset: (...args: unknown[]) => Promise<null>;
  hdel: (...args: unknown[]) => Promise<null>;
  hgetall: (...args: unknown[]) => Promise<null>;
  lpush: (...args: unknown[]) => Promise<null>;
  lrange: (...args: unknown[]) => Promise<null>;
  call: (...args: unknown[]) => Promise<null>;
  publish: (...args: unknown[]) => Promise<null>;
  subscribe: (...args: unknown[]) => Promise<null>;
  quit: (...args: unknown[]) => Promise<null>;
  disconnect: (...args: unknown[]) => Promise<null>;
};

export type AnyRedis = (RedisClient & { isNoOp?: false }) | NoOpRedis;

let redisInstance: AnyRedis | null = null;

function createNoOpRedis(): NoOpRedis {
  const noop = async (): Promise<null> => null;
  const noopArr = async (): Promise<never[]> => [];
  return {
    get: noop, set: noop, setex: noop, del: noop, incr: noop,
    expire: noop, exists: noop, smembers: noopArr, sadd: noop,
    hget: noop, hset: noop, hdel: noop, hgetall: noop,
    lpush: noop, lrange: noop, call: noop,
    publish: noop, subscribe: noop, quit: noop, disconnect: noop,
    isNoOp: true,
    status: 'noop',
  };
}

export function getRedis(): AnyRedis {
  if (redisInstance) return redisInstance;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('REDIS_URL not set — caching, queues and rate-limiting disabled');
    } else {
      logger.debug('REDIS_URL not set — using no-op Redis stub (dev only)');
    }
    redisInstance = createNoOpRedis();
    return redisInstance;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IORedis = require('ioredis') as typeof import('ioredis').default;
    const isTls = redisUrl.startsWith('rediss://');
    const client = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      // Self-signed certs are common on managed Redis (Upstash, Render Redis).
      // Default to accepting them; override with REDIS_TLS_REJECT_UNAUTHORIZED=true
      // only if you control the CA and want strict validation.
      ...(isTls ? { tls: { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED === 'true' } } : {}),
    });

    client.on('connect', () => {
      logger.info('Redis connected');
    });
    client.on('error', (err: Error) => {
      logger.error({ err: err.message }, 'Redis error');
    });
    client.on('close', () => {
      logger.debug('Redis connection closed');
    });

    client.connect().catch((err: Error) => {
      logger.warn({ err: err.message }, 'Redis connection failed — continuing without Redis');
    });

    redisInstance = client as AnyRedis;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'ioredis unavailable — using no-op stub');
    redisInstance = createNoOpRedis();
  }

  return redisInstance;
}

/**
 * Cache helper — get or compute a value with TTL.
 * Falls back to calling fn() directly when Redis is unavailable.
 *
 * @param key  Cache key
 * @param ttl  Seconds to cache
 * @param fn   Async function to compute value on cache miss
 */
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const client = getRedis();
  if (client.isNoOp) return fn();

  try {
    const hit = await (client as RedisClient).get(key);
    if (hit) return JSON.parse(hit) as T;
    const value = await fn();
    if (value != null) {
      await (client as RedisClient).setex(key, ttl, JSON.stringify(value));
    }
    return value;
  } catch (err) {
    logger.warn({ err: (err as Error).message, key }, 'Cache error — falling back to DB');
    return fn();
  }
}

/** Invalidate a cache key. */
export async function invalidate(keyPrefix: string): Promise<void> {
  const client = getRedis();
  if (client.isNoOp) return;
  try {
    await (client as RedisClient).del(keyPrefix);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Cache invalidation failed');
  }
}

module.exports = { getRedis, cached, invalidate };
