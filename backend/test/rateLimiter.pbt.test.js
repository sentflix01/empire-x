'use strict';

// Feature: showroom-external-api, Property 12: Per-IP quota enforcement
//
// For any IP address and any showroom section, after one outbound fetch has been
// performed within a 60-second window, any subsequent fetch request from the same
// IP within that same window SHALL be rejected with { allowed: false }.
// The first call for any IP/section combo MUST always be allowed.
//
// Validates: Requirements 5.1, 5.2

const fc = require('fast-check');

// ─── Mock logger BEFORE requiring rateLimiter ─────────────────────────────────
jest.mock('../lib/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ─── Mock Redis with a real in-memory implementation ─────────────────────────
jest.mock('../lib/redis', () => ({
  getRedis: jest.fn(),
}));

/**
 * Build an in-memory Redis mock that behaves like real INCR+EXPIRE.
 * Uses a Map<key, {count, expiresAt}> as the backing store.
 */
function makeRedisMock() {
  const store = new Map();

  return {
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

    _reset() {
      store.clear();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 12 — Per-IP quota enforcement', () => {
  let redisMock;
  let checkLimit;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    redisMock = makeRedisMock();
    require('../lib/redis').getRedis = jest.fn().mockReturnValue(redisMock);

    checkLimit = require('../services/rateLimiter').checkLimit;
  });

  // Feature: showroom-external-api, Property 12: Per-IP quota enforcement
  test('first call is ALWAYS allowed for any IP + section combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (ip, showroomId, sectionKey) => {
          // Reset store so each iteration starts fresh
          redisMock._reset();

          const result = await checkLimit(ip, showroomId, sectionKey);
          return result.allowed === true;
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: showroom-external-api, Property 12: Per-IP quota enforcement
  test('second call within window is ALWAYS blocked for any IP + section combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (ip, showroomId, sectionKey) => {
          redisMock._reset();

          await checkLimit(ip, showroomId, sectionKey); // first call — consume quota
          const second = await checkLimit(ip, showroomId, sectionKey);
          return second.allowed === false;
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: showroom-external-api, Property 12: Per-IP quota enforcement
  test('429 (allowed: false) NEVER fires on the very first call for any IP/section combo', async () => {
    // Equivalent to the first-call property but framed as the negative invariant:
    // there is NO (ip, showroomId, sectionKey) for which the first call returns allowed=false.
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (ip, showroomId, sectionKey) => {
          redisMock._reset();

          const result = await checkLimit(ip, showroomId, sectionKey);
          // allowed must never be false on the first call
          return result.allowed !== false;
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: showroom-external-api, Property 12: Per-IP quota enforcement
  test('different IPs are always independent (first call for each IP is allowed)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.ipV4(), { minLength: 2, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (ips, showroomId, sectionKey) => {
          redisMock._reset();

          // Exhaust the first IP's quota
          await checkLimit(ips[0], showroomId, sectionKey);

          // All other IPs should still be allowed on their first call
          for (let i = 1; i < ips.length; i++) {
            const result = await checkLimit(ips[i], showroomId, sectionKey);
            if (!result.allowed) return false;
          }
          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  // Feature: showroom-external-api, Property 12: Per-IP quota enforcement
  test('blocked result always includes a retryAfter value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (ip, showroomId, sectionKey) => {
          redisMock._reset();

          await checkLimit(ip, showroomId, sectionKey);
          const blocked = await checkLimit(ip, showroomId, sectionKey);

          if (!blocked.allowed) {
            return (
              blocked.retryAfter !== undefined &&
              typeof blocked.retryAfter === 'number' &&
              blocked.retryAfter > 0
            );
          }
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
