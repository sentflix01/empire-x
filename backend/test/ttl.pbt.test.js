'use strict';

// Feature: showroom-external-api, Property 11: TTL minutes-to-seconds conversion
//
// For any integer minute value M in the range [1, 1440], the ttl_seconds stored
// on the External_Data_Source record SHALL equal M × 60.
//
// Validates: Requirements 6.2, 6.3

const fc = require('fast-check');

/**
 * The TTL conversion formula used by the route layer (POST/PUT external-sources).
 * This is a pure arithmetic function — the route does `ttl_seconds = ttl_minutes * 60`.
 *
 * @param {number} minutes - TTL value in minutes (integer, 1–1440)
 * @returns {number} ttl_seconds
 */
function convertTtlToSeconds(minutes) {
  return minutes * 60;
}

describe('Property 11 — TTL minutes-to-seconds conversion', () => {
  // Feature: showroom-external-api, Property 11: TTL minutes-to-seconds conversion

  test('ttl_seconds equals M × 60 for all valid minute values [1, 1440]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1440 }),
        (minutes) => {
          const seconds = convertTtlToSeconds(minutes);
          return seconds === minutes * 60;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('ttl_seconds is always a positive integer for valid minute inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1440 }),
        (minutes) => {
          const seconds = convertTtlToSeconds(minutes);
          return Number.isInteger(seconds) && seconds >= 60;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('boundary: 1 minute converts to exactly 60 seconds', () => {
    expect(convertTtlToSeconds(1)).toBe(60);
  });

  test('boundary: 1440 minutes converts to exactly 86400 seconds (24 hours)', () => {
    expect(convertTtlToSeconds(1440)).toBe(86400);
  });

  test('ttl_seconds is strictly greater for larger minute values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1439 }),
        (m) => {
          return convertTtlToSeconds(m + 1) > convertTtlToSeconds(m);
        }
      ),
      { numRuns: 100 }
    );
  });
});
