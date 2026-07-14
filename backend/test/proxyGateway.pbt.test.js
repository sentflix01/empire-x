'use strict';

// Feature: showroom-external-api, Property 15: Disabled source returns empty array
//
// For any External_Data_Source with is_enabled = false, a call to fetchSection
// SHALL return an empty array ([]) without making any outbound HTTP request or
// reading from the Redis cache.
//
// Validates: Requirements 10.2

const fc = require('fast-check');

// ─── Mock all external dependencies before requiring the service ──────────────
jest.mock('../lib/redis', () => ({
  getRedis: jest.fn(),
}));

jest.mock('../lib/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../services/rateLimiter', () => ({
  checkLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('../services/ssrfValidator', () => ({
  validateUrl: jest.fn().mockResolvedValue({ ok: true }),
  isBlockedIp: jest.fn().mockReturnValue(false),
}));

jest.mock('../services/credentialEncryption', () => ({
  encrypt: jest.fn((p) => ({ iv: 'iv', authTag: 'at', ciphertext: p })),
  decrypt: jest.fn((obj) => obj.ciphertext),
}));

const { fetchSection } = require('../services/proxyGateway');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a mock DB pool.
 * `query` is called twice inside fetchSection on a cache miss:
 *   1. SELECT * FROM external_data_sources WHERE showroom_id=$1 AND section_key=$2
 *   2. SELECT source_path, target_field FROM field_mappings WHERE source_id=$1
 *
 * When is_enabled = false, only the first query executes (the function returns []
 * immediately without reading the cache or querying field_mappings).
 *
 * @param {object} sourceRow - The source row to return from the DB.
 */
function makePool(sourceRow) {
  return {
    query: jest.fn().mockResolvedValue({ rows: [sourceRow] }),
  };
}

/**
 * Build a Redis mock that tracks whether get/setex were called.
 */
function makeRedisMock() {
  return {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Arbitrary for a disabled source config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a plausible external_data_sources row with is_enabled forced to false.
 * We use fc.record() to vary URL, auth_method, ttl_seconds, etc. across runs.
 */
const disabledSourceArb = fc.record({
  id: fc.uuid(),
  showroom_id: fc.uuid(),
  section_key: fc.string({ minLength: 1, maxLength: 30 }),
  url: fc.constant('https://api.example.com/items'), // valid HTTPS URL
  auth_method: fc.constantFrom('none', 'bearer_token', 'api_key_header', 'api_key_query'),
  credential: fc.option(
    fc.record({
      iv: fc.hexaString({ minLength: 24, maxLength: 24 }),
      authTag: fc.hexaString({ minLength: 32, maxLength: 32 }),
      ciphertext: fc.hexaString({ minLength: 1, maxLength: 64 }),
    }),
    { nil: null }
  ),
  header_name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
  query_param: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
  ttl_seconds: fc.integer({ min: 60, max: 86400 }),
  is_enabled: fc.constant(false), // ← ALWAYS disabled
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 15 — Disabled source returns empty array', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature: showroom-external-api, Property 15: Disabled source returns empty array
  test('fetchSection returns [] for any disabled source config', async () => {
    await fc.assert(
      fc.asyncProperty(
        disabledSourceArb,
        async (sourceRow) => {
          const pool = makePool(sourceRow);
          const redis = makeRedisMock();

          const result = await fetchSection(pool, redis, {
            showroomId: sourceRow.showroom_id,
            sectionKey: sourceRow.section_key,
            ip: '1.2.3.4',
          });

          return Array.isArray(result) && result.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: showroom-external-api, Property 15: Disabled source returns empty array
  test('Redis cache is never read when source is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        disabledSourceArb,
        async (sourceRow) => {
          const pool = makePool(sourceRow);
          const redis = makeRedisMock();

          await fetchSection(pool, redis, {
            showroomId: sourceRow.showroom_id,
            sectionKey: sourceRow.section_key,
            ip: '1.2.3.4',
          });

          // redis.get should NOT have been called — disabled sources skip the cache
          return redis.get.mock.calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: showroom-external-api, Property 15: Disabled source returns empty array
  test('outbound fetch (global fetch / node-fetch) is never called when source is disabled', async () => {
    // Spy on global fetch if available, otherwise mock it
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    await fc.assert(
      fc.asyncProperty(
        disabledSourceArb,
        async (sourceRow) => {
          const pool = makePool(sourceRow);
          const redis = makeRedisMock();

          fetchSpy.mockClear();

          await fetchSection(pool, redis, {
            showroomId: sourceRow.showroom_id,
            sectionKey: sourceRow.section_key,
            ip: '1.2.3.4',
          });

          return fetchSpy.mock.calls.length === 0;
        }
      ),
      { numRuns: 50 }
    );

    fetchSpy.mockRestore();
  });
});
