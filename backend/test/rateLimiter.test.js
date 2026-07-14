'use strict';

/**
 * Unit tests for backend/services/rateLimiter.js
 *
 * Validates: Requirements 5.1, 5.4
 * Design refs: Testing Strategy → Unit Tests (rateLimiter.test.js)
 *
 * Strategy:
 *  - Redis path: mock '../lib/redis' so getRedis() returns a controllable
 *    ioredis-like client (with status: 'ready' and real incr/expire logic).
 *  - Fallback path: configure the mock client to throw on every call,
 *    which triggers the in-memory fallback inside rateLimiter.
 *  - Warning logging: spy on the logger.warn to verify it is called when
 *    the fallback activates.
 */

// ─── Mock logger BEFORE requiring rateLimiter ─────────────────────────────────
jest.mock('../lib/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ─── Mock Redis BEFORE requiring rateLimiter ─────────────────────────────────
jest.mock('../lib/redis', () => {
  return {
    getRedis: jest.fn(),
  };
});

const { getRedis } = require('../lib/redis');
const logger = require('../lib/logger');

// Require rateLimiter AFTER mocks are in place.
// Each test that needs a fresh fallback store state must reset module registry.
let checkLimit;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a minimal in-memory Redis client mock that behaves like a real
 * Redis INCR+EXPIRE pattern: keeps an in-process map of key → counter.
 */
function makeRedisMock() {
  const store = new Map(); // key → { count, expiresAt }

  const client = {
    status: 'ready',
    isNoOp: false,

    async incr(key) {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || entry.expiresAt <= now) {
        store.set(key, { count: 1, expiresAt: now + 60_000 });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },

    async expire(key, seconds) {
      const entry = store.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + seconds * 1000;
      }
      return 1;
    },

    // Allow tests to manually clear the store (simulate TTL expiry)
    _reset() {
      store.clear();
    },

    // Allow tests to advance time by expiring a specific key
    _expire(key) {
      store.delete(key);
    },
  };

  return client;
}

/**
 * Build a Redis client mock that throws on every call, simulating Redis
 * being completely unavailable.
 */
function makeThrowingRedisMock() {
  return {
    status: 'ready',
    isNoOp: false,

    async incr() {
      throw new Error('Redis connection refused');
    },

    async expire() {
      throw new Error('Redis connection refused');
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset the module registry so each describe block gets a fresh rateLimiter
  // module with a clean fallback store and a fresh `redisHealthy` flag.
  jest.resetModules();
  jest.clearAllMocks();

  // Re-require mocks and module under test after reset
  const redisModule = require('../lib/redis');
  const loggerModule = require('../lib/logger');
  // Re-attach spies after resetModules
  jest.spyOn(loggerModule, 'warn');

  checkLimit = require('../services/rateLimiter').checkLimit;
});

// ─────────────────────────────────────────────────────────────────────────────
// Group: Redis-backed path
// ─────────────────────────────────────────────────────────────────────────────

describe('rateLimiter — Redis-backed counter', () => {
  let redisMock;

  beforeEach(() => {
    redisMock = makeRedisMock();
    require('../lib/redis').getRedis.mockReturnValue(redisMock);
    // Re-require to get a fresh module with clean state after resetModules in beforeEach
    checkLimit = require('../services/rateLimiter').checkLimit;
  });

  test('first call within window is allowed', async () => {
    const result = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(result.allowed).toBe(true);
  });

  test('second call within same 60s window is blocked', async () => {
    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    const result = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(result.allowed).toBe(false);
  });

  test('blocked response includes retryAfter value', async () => {
    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    const result = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(result.retryAfter).toBeDefined();
    expect(typeof result.retryAfter).toBe('number');
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  test('different IP addresses have independent counters', async () => {
    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    const result = await checkLimit('192.0.2.2', 'showroom-1', 'items');
    expect(result.allowed).toBe(true);
  });

  test('different showroom IDs have independent counters for same IP', async () => {
    await checkLimit('192.0.2.1', 'showroom-A', 'items');
    const result = await checkLimit('192.0.2.1', 'showroom-B', 'items');
    expect(result.allowed).toBe(true);
  });

  test('different section keys have independent counters for same IP and showroom', async () => {
    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    const result = await checkLimit('192.0.2.1', 'showroom-1', 'services');
    expect(result.allowed).toBe(true);
  });

  test('first call is allowed again after TTL window expires', async () => {
    await checkLimit('192.0.2.1', 'showroom-1', 'items');

    // Simulate window expiry by clearing the key in the mock store
    redisMock._expire('ratelimit:192.0.2.1:showroom-1:items');

    const result = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(result.allowed).toBe(true);
  });

  test('third call within window is also blocked', async () => {
    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    const third = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(third.allowed).toBe(false);
  });

  test('never returns allowed: false unless quota is exceeded', async () => {
    // The first call must always be allowed — it's impossible to exceed quota
    // on the very first request in a window.
    const result = await checkLimit('10.0.0.1', 'room-X', 'gallery');
    expect(result.allowed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group: In-memory fallback when Redis throws
// ─────────────────────────────────────────────────────────────────────────────

describe('rateLimiter — in-memory fallback when Redis is unavailable', () => {
  beforeEach(() => {
    require('../lib/redis').getRedis.mockReturnValue(makeThrowingRedisMock());
    checkLimit = require('../services/rateLimiter').checkLimit;
  });

  test('first call is still allowed when Redis throws', async () => {
    const result = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(result.allowed).toBe(true);
  });

  test('second call within window is blocked even in fallback mode', async () => {
    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    const result = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(result.allowed).toBe(false);
  });

  test('different IPs are independent in fallback mode', async () => {
    await checkLimit('192.0.2.10', 'showroom-1', 'items');
    const result = await checkLimit('192.0.2.11', 'showroom-1', 'items');
    expect(result.allowed).toBe(true);
  });

  test('different section keys are independent in fallback mode', async () => {
    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    const result = await checkLimit('192.0.2.1', 'showroom-1', 'services');
    expect(result.allowed).toBe(true);
  });

  test('blocked result in fallback includes retryAfter', async () => {
    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    const result = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group: Warning logged when fallback activates
// ─────────────────────────────────────────────────────────────────────────────

describe('rateLimiter — warning logged on fallback activation', () => {
  test('logs a warning when Redis is unavailable and fallback activates', async () => {
    require('../lib/redis').getRedis.mockReturnValue(makeThrowingRedisMock());
    checkLimit = require('../services/rateLimiter').checkLimit;

    const loggerMod = require('../lib/logger');

    await checkLimit('192.0.2.1', 'showroom-1', 'items');

    expect(loggerMod.warn).toHaveBeenCalled();

    // Verify the warning message mentions fallback / in-memory / Redis
    const warnCalls = loggerMod.warn.mock.calls;
    const warningTexts = warnCalls.map((args) => JSON.stringify(args)).join(' ');
    expect(warningTexts).toMatch(/fallback|in-process|in-memory|Redis/i);
  });

  test('warning is logged only once per transition (not on every call)', async () => {
    require('../lib/redis').getRedis.mockReturnValue(makeThrowingRedisMock());
    checkLimit = require('../services/rateLimiter').checkLimit;

    const loggerMod = require('../lib/logger');

    // Make several calls — the warning about Redis unavailability should only
    // fire once (on the first transition from healthy → unhealthy).
    await checkLimit('1.2.3.4', 'showroom-1', 'items');
    await checkLimit('1.2.3.5', 'showroom-1', 'items');
    await checkLimit('1.2.3.6', 'showroom-1', 'items');

    // Count only the "unavailable / fallback" warning calls
    const fallbackWarnings = loggerMod.warn.mock.calls.filter((args) =>
      JSON.stringify(args).match(/fallback|unavailable|in-process|in-memory/i)
    );

    expect(fallbackWarnings).toHaveLength(1);
  });

  test('does NOT log a fallback warning when Redis is healthy', async () => {
    const redisMock = makeRedisMock();
    require('../lib/redis').getRedis.mockReturnValue(redisMock);
    checkLimit = require('../services/rateLimiter').checkLimit;

    const loggerMod = require('../lib/logger');

    await checkLimit('192.0.2.1', 'showroom-1', 'items');

    const fallbackWarnings = loggerMod.warn.mock.calls.filter((args) =>
      JSON.stringify(args).match(/fallback|unavailable|in-process|in-memory/i)
    );

    expect(fallbackWarnings).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group: No-op Redis stub (REDIS_URL not configured)
// ─────────────────────────────────────────────────────────────────────────────

describe('rateLimiter — no-op Redis stub (isNoOp: true)', () => {
  test('falls back to in-memory when getRedis returns a no-op stub', async () => {
    require('../lib/redis').getRedis.mockReturnValue({
      status: 'noop',
      isNoOp: true,
      incr: async () => null,
      expire: async () => null,
    });
    checkLimit = require('../services/rateLimiter').checkLimit;

    const result = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(result.allowed).toBe(true);
  });

  test('no-op fallback correctly blocks on second call', async () => {
    require('../lib/redis').getRedis.mockReturnValue({
      status: 'noop',
      isNoOp: true,
      incr: async () => null,
      expire: async () => null,
    });
    checkLimit = require('../services/rateLimiter').checkLimit;

    await checkLimit('192.0.2.1', 'showroom-1', 'items');
    const second = await checkLimit('192.0.2.1', 'showroom-1', 'items');
    expect(second.allowed).toBe(false);
  });
});
