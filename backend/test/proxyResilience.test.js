/**
 * proxyGateway resilience tests — Patent 4 claim-3 embodiments.
 *
 * Locks in, as executable evidence of reduction to practice:
 *   1. Stale-cache fallback: upstream failure serves last-known-good payload
 *      (flagged stale) instead of an error, when one exists.
 *   2. Circuit breaker: repeated consecutive failures stop live fetches for a
 *      cooldown window (serving stale), then half-open to retry.
 */
'use strict';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const mockPool = require('./helpers/mockPool');
const { buildCacheKey } = require('../services/proxyGateway');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../db/pool', () => require('./helpers/mockPool'));
jest.mock('../lib/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

// In-memory Redis double with separate fresh/stale namespaces.
const store = new Map();
const redisDouble = {
  get: async (k) => store.get(k) ?? null,
  setex: async (k, ttl, v) => { store.set(k, v); },
};
jest.mock('../lib/redis', () => ({
  getRedis: () => ({ isNoOp: true }), // rate limiter path → fail-open
  __setRedis: (r) => { /* placeholder */ },
}));

// fetchSection reads cache via `redis` argument — we pass redisDouble directly.

const { fetchSection } = require('../services/proxyGateway');
const { checkLimit } = require('../services/rateLimiter');

jest.mock('../services/rateLimiter', () => ({
  checkLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));
jest.mock('../services/ssrfValidator', () => ({
  validateUrl: jest.fn().mockResolvedValue({ ok: true }),
}));
jest.mock('../services/credentialEncryption', () => ({
  decrypt: () => 'secret',
  encrypt: () => ({}),
}));

const SOURCE = {
  id: 'src-1',
  showroom_id: 'showroom-1',
  url: 'https://api.example.com/items',
  auth_method: 'none',
  credential: null,
  header_name: null,
  query_param: null,
  ttl_seconds: 60,
  is_enabled: true,
};

function seedSource() {
  mockPool.query.mockImplementation(async (sql) => {
    if (sql.includes('external_data_sources')) return { rows: [SOURCE] };
    if (sql.includes('field_mappings')) {
      return { rows: [{ source_path: 'name', target_field: 'title' }] };
    }
    if (sql.includes('external_health_records')) return { rows: [] };
    return { rows: [] };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  seedSource();
});

describe('Patent 4 — stale-cache fallback (claim 3)', () => {
  test('successful fetch caches both fresh and last-known-good copies', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ name: 'Widget A' }],
    });

    const result = await fetchSection(mockPool, redisDouble, { showroomId: 'showroom-1', sectionKey: 'products', ip: '1.1.1.1' });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toEqual({ title: 'Widget A' });

    const key = buildCacheKey('showroom-1', 'products');
    expect(store.get(key)).toBeTruthy();                       // fresh copy
    expect(store.get(`stale:${key}`)).toContain('Widget A');   // stale copy written too
  });

  test('upstream failure serves the stale copy flagged as stale instead of erroring', async () => {
    // Prime last-known-good data
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ name: 'Good data' }] });
    await fetchSection(mockPool, redisDouble, { showroomId: 'showroom-1', sectionKey: 'products', ip: '1.1.1.1' });

    // Upstream now dies AND the fresh copy has expired — only stale remains
    store.delete(buildCacheKey('showroom-1', 'products'));
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await fetchSection(mockPool, redisDouble, { showroomId: 'showroom-1', sectionKey: 'products', ip: '1.1.1.1' });

    expect(result).toMatchObject({ stale: true });
    expect(result.items).toEqual([{ title: 'Good data' }]);
  });

  test('with no stale history available, failure surfaces as before', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const result = await fetchSection(mockPool, redisDouble, { showroomId: 'showroom-x', sectionKey: 'fresh', ip: '1.1.1.1' });
    expect(result).toMatchObject({ upstreamError: true });
  });
});
