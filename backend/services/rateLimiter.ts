/**
 * services/rateLimiter.ts — Per-IP, per-section rate limiting for the proxy gateway.
 *
 * CRITICAL CONTRACT: checkLimit returns { allowed: false } ONLY when the per-IP quota
 * is exceeded. Never returns false for Redis errors, fallback activation, or exceptions.
 */
import { getRedis } from '../lib/redis';
import logger from '../lib/logger';
import type { Redis as RedisClient } from 'ioredis';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS   = 1;

interface RateLimitEntry { count: number; expiresAt: number; }
const fallbackStore = new Map<string, RateLimitEntry>();
let redisHealthy = true;

function sweepFallbackStore(): void {
  const now = Date.now();
  for (const [k, e] of fallbackStore) { if (e.expiresAt <= now) fallbackStore.delete(k); }
}

function checkLimitFallback(key: string): { allowed: boolean; retryAfter?: number } {
  sweepFallbackStore();
  const now = Date.now();
  const e   = fallbackStore.get(key);
  if (!e || e.expiresAt <= now) { fallbackStore.set(key, { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 }); return { allowed: true }; }
  if (e.count < MAX_REQUESTS) { e.count++; return { allowed: true }; }
  return { allowed: false, retryAfter: Math.ceil((e.expiresAt - now) / 1000) };
}

export async function checkLimit(
  ip: string,
  showroomId: string,
  sectionKey: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `ratelimit:${ip}:${showroomId}:${sectionKey}`;
  try {
    const client = getRedis();
    if (client.isNoOp || (client as { status?: string }).status === 'noop') throw new Error('Redis is not configured');
    const status = (client as { status?: string }).status;
    if (status && status !== 'ready' && status !== 'connect') throw new Error(`Redis not ready (${status})`);
    const count = await (client as RedisClient).incr(key);
    if (count === 1) { await (client as RedisClient).expire(key, WINDOW_SECONDS).catch((e: Error) => logger.warn({ err: e.message, key }, 'rateLimiter: EXPIRE failed')); }
    if (!redisHealthy) { redisHealthy = true; logger.info('rateLimiter: Redis available again'); }
    return count > MAX_REQUESTS ? { allowed: false, retryAfter: WINDOW_SECONDS } : { allowed: true };
  } catch (redisErr) {
    if (redisHealthy) { redisHealthy = false; logger.warn({ err: (redisErr as Error).message }, 'rateLimiter: Redis unavailable — using in-memory fallback'); }
    try { return checkLimitFallback(key); } catch (fallbackErr) {
      logger.error({ err: (fallbackErr as Error).message }, 'rateLimiter: fallback threw — allowing request');
      return { allowed: true };
    }
  }
}

module.exports = { checkLimit };
