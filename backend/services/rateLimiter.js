'use strict';

/**
 * rateLimiter.js — Per-IP, per-section rate limiting
 *
 * Enforces a maximum of 1 outbound fetch per IP per showroom section per 60-second window.
 *
 * Primary store: Redis key `ratelimit:{ip}:{showroomId}:{sectionKey}` with 60 s expiry.
 * Fallback store: in-process Map<string, {count, expiresAt}> used when Redis is unavailable.
 *
 * CRITICAL CONTRACT:
 *   - checkLimit returns { allowed: false } ONLY when the per-IP quota is actually exceeded.
 *   - It NEVER returns { allowed: false } for any other reason (Redis errors, fallback
 *     activation, unexpected exceptions, etc.).
 *   - When Redis becomes available again, the service automatically switches back on the
 *     next call — no restart required.
 */

const { getRedis } = require('../lib/redis');
const logger = require('../lib/logger');

/** Window duration in seconds. */
const WINDOW_SECONDS = 60;

/** Maximum number of fetches allowed per IP per section per window. */
const MAX_REQUESTS = 1;

/**
 * In-process fallback store.
 * Map key: same string as the Redis key.
 * Map value: { count: number, expiresAt: number (ms epoch) }
 *
 * Entries are lazily cleaned up when accessed or during periodic sweep.
 * @type {Map<string, { count: number, expiresAt: number }>}
 */
const fallbackStore = new Map();

/**
 * Whether the last Redis attempt succeeded. Used to decide whether to log
 * the "Redis unavailable — using in-memory fallback" warning (only once per
 * transition from healthy → unhealthy to avoid log spam).
 */
let redisHealthy = true;

/**
 * Purge stale entries from the in-memory fallback store.
 * Called lazily on each fallback path to prevent unbounded memory growth.
 */
function sweepFallbackStore() {
  const now = Date.now();
  for (const [key, entry] of fallbackStore) {
    if (entry.expiresAt <= now) {
      fallbackStore.delete(key);
    }
  }
}

/**
 * In-memory fallback implementation of checkLimit.
 * Uses the same semantics as the Redis path: max 1 request per WINDOW_SECONDS.
 *
 * @param {string} key - The rate-limit key (same as the Redis key).
 * @returns {{ allowed: boolean, retryAfter?: number }}
 */
function checkLimitFallback(key) {
  sweepFallbackStore();

  const now = Date.now();
  const entry = fallbackStore.get(key);

  if (!entry || entry.expiresAt <= now) {
    // First request in this window — allow and start counter.
    fallbackStore.set(key, {
      count: 1,
      expiresAt: now + WINDOW_SECONDS * 1000,
    });
    return { allowed: true };
  }

  if (entry.count < MAX_REQUESTS) {
    // Still within quota — increment and allow.
    entry.count += 1;
    return { allowed: true };
  }

  // Quota exceeded — calculate remaining window time.
  const retryAfter = Math.ceil((entry.expiresAt - now) / 1000);
  return { allowed: false, retryAfter };
}

/**
 * Check whether the caller identified by `ip` is within the rate-limit quota
 * for the given showroom section.
 *
 * Primary path (Redis available):
 *   Uses INCR + EXPIRE on `ratelimit:{ip}:{showroomId}:{sectionKey}`.
 *   - First call in window: INCR → 1, EXPIRE sets 60 s TTL, returns { allowed: true }.
 *   - Subsequent calls within window: INCR → >1, returns { allowed: false, retryAfter: 60 }.
 *
 * Fallback path (Redis unavailable):
 *   Logs a warning (once per unhealthy transition) and uses the in-process Map.
 *   On every call, first attempts to detect whether Redis is now healthy again;
 *   if so, switches back to the Redis path transparently.
 *
 * GUARANTEE: { allowed: false } is returned ONLY when the quota is exceeded.
 *   Any Redis error, connection loss, or unexpected exception causes the function
 *   to fall through to the in-memory store (or to allow the request) rather than
 *   falsely blocking it.
 *
 * @param {string} ip          - Caller IP address.
 * @param {string} showroomId  - Showroom UUID.
 * @param {string} sectionKey  - Section identifier string.
 * @returns {Promise<{ allowed: boolean, retryAfter?: number }>}
 */
async function checkLimit(ip, showroomId, sectionKey) {
  const key = `ratelimit:${ip}:${showroomId}:${sectionKey}`;

  // ─── Redis path ───────────────────────────────────────────────────────────
  try {
    const client = getRedis();

    // The no-op stub (when REDIS_URL is unset) has isNoOp === true and
    // status === 'noop'. Treat it as unavailable and use the fallback.
    if (client.isNoOp || client.status === 'noop') {
      throw new Error('Redis is not configured (no-op stub)');
    }

    // Verify the client is in a ready state before attempting I/O.
    // ioredis exposes `client.status` ('connect', 'ready', 'reconnecting', etc.)
    if (client.status !== 'ready' && client.status !== 'connect') {
      throw new Error(`Redis not ready (status: ${client.status})`);
    }

    // Atomic increment — returns the new counter value.
    const count = await client.incr(key);

    if (count === 1) {
      // First request in this window: set the expiry.
      // If EXPIRE fails, the key will persist until Redis evicts it, but we
      // still allow the request — better to allow than to falsely block.
      await client.expire(key, WINDOW_SECONDS).catch((expireErr) => {
        logger.warn(
          { err: expireErr.message, key },
          'rateLimiter: EXPIRE failed after INCR — window may not expire correctly'
        );
      });
    }

    // Restore "healthy" flag and log recovery if we were previously on fallback.
    if (!redisHealthy) {
      redisHealthy = true;
      logger.info('rateLimiter: Redis available again — switched back from in-memory fallback');
    }

    if (count > MAX_REQUESTS) {
      return { allowed: false, retryAfter: WINDOW_SECONDS };
    }

    return { allowed: true };
  } catch (redisErr) {
    // ─── Fallback path ───────────────────────────────────────────────────────
    // Log the warning only on the first transition to unhealthy to avoid spam.
    if (redisHealthy) {
      redisHealthy = false;
      logger.warn(
        { err: redisErr.message },
        'rateLimiter: Redis unavailable — falling back to in-process rate-limit store'
      );
    }

    // In-memory fallback — MUST NOT return { allowed: false } for any reason
    // other than the quota being exceeded.
    try {
      return checkLimitFallback(key);
    } catch (fallbackErr) {
      // If even the in-memory fallback throws (should never happen in practice),
      // allow the request rather than falsely blocking it.
      logger.error(
        { err: fallbackErr.message },
        'rateLimiter: in-memory fallback threw unexpectedly — allowing request'
      );
      return { allowed: true };
    }
  }
}

module.exports = { checkLimit };
