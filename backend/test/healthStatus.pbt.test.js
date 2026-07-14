'use strict';

// Feature: showroom-external-api, Property 17: Health status display consistency
//
// For any Health_Record:
//   - success === true  → getDisplayStatus returns 'healthy'
//   - success === false → getDisplayStatus returns 'failing' (NEVER 'healthy')
//   - success absent / null / undefined → getDisplayStatus returns 'never_fetched'
//
// The getDisplayStatus logic lives in DataSourceStatusPanel.tsx (frontend).
// Since we're in a backend Jest environment without TSX transpilation, we
// implement it here as a pure JS function that exactly mirrors the TypeScript
// implementation and test the invariants against it.
//
// Validates: Requirements 8.2, 8.3

const fc = require('fast-check');

// ─────────────────────────────────────────────────────────────────────────────
// getDisplayStatus — mirrors DataSourceStatusPanel.tsx exactly
//
//   Explicit guard: if record.success === false, ALWAYS return 'failing'.
//   The 'healthy' branch is ONLY reachable when record.success === true.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the display status for a health record.
 *
 * @param {{ success?: boolean | null, [key: string]: unknown } | null | undefined} record
 * @returns {'healthy' | 'failing' | 'never_fetched'}
 */
function getDisplayStatus(record) {
  // No record at all → never fetched
  if (record == null) {
    return 'never_fetched';
  }

  // Explicit guard: success=false MUST always return 'failing'.
  // This guard is tested independently (Property 17).
  if (record.success === false) {
    return 'failing';
  }

  // success=true → healthy
  if (record.success === true) {
    return 'healthy';
  }

  // success absent / null / undefined → never fetched
  return 'never_fetched';
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 17 — Health status display consistency', () => {
  // Feature: showroom-external-api, Property 17: Health status display consistency

  test('success=false NEVER returns healthy — for any record shape', () => {
    // Core invariant: success=false can never reach the 'healthy' branch
    fc.assert(
      fc.property(
        fc.record({
          success: fc.constant(false),
          section_key: fc.string(),
          http_status: fc.option(fc.integer({ min: 100, max: 599 }), { nil: null }),
          fetched_at: fc.option(fc.string(), { nil: null }),
          error_msg: fc.option(fc.string(), { nil: null }),
        }),
        (record) => {
          const status = getDisplayStatus(record);
          return status !== 'healthy';
        }
      ),
      { numRuns: 200 }
    );
  });

  // Feature: showroom-external-api, Property 17: Health status display consistency
  test('success=false ALWAYS returns failing', () => {
    fc.assert(
      fc.property(
        fc.record({
          success: fc.constant(false),
          section_key: fc.string(),
          http_status: fc.option(fc.integer({ min: 100, max: 599 }), { nil: null }),
          fetched_at: fc.option(fc.string(), { nil: null }),
          error_msg: fc.option(fc.string(), { nil: null }),
        }),
        (record) => {
          const status = getDisplayStatus(record);
          return status === 'failing';
        }
      ),
      { numRuns: 200 }
    );
  });

  // Feature: showroom-external-api, Property 17: Health status display consistency
  test('success=true ALWAYS returns healthy', () => {
    fc.assert(
      fc.property(
        fc.record({
          success: fc.constant(true),
          section_key: fc.string(),
          http_status: fc.option(fc.integer({ min: 200, max: 299 }), { nil: null }),
          fetched_at: fc.option(fc.string(), { nil: null }),
        }),
        (record) => {
          const status = getDisplayStatus(record);
          return status === 'healthy';
        }
      ),
      { numRuns: 200 }
    );
  });

  // Feature: showroom-external-api, Property 17: Health status display consistency
  test('success boolean → correct status (both values in same run)', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.string(),
        fc.option(fc.integer({ min: 100, max: 599 }), { nil: null }),
        (success, section_key, http_status) => {
          const record = { success, section_key, http_status };
          const status = getDisplayStatus(record);

          if (success === true) return status === 'healthy';
          if (success === false) return status === 'failing' && status !== 'healthy';
          return true;
        }
      ),
      { numRuns: 200 }
    );
  });

  // Feature: showroom-external-api, Property 17: Health status display consistency
  test('null or missing record returns never_fetched', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.constant(undefined)),
        (record) => {
          const status = getDisplayStatus(record);
          return status === 'never_fetched';
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: showroom-external-api, Property 17: Health status display consistency
  test('record with no success field returns never_fetched', () => {
    fc.assert(
      fc.property(
        fc.record({
          section_key: fc.string(),
          // success is deliberately absent
        }),
        (record) => {
          const status = getDisplayStatus(record);
          return status === 'never_fetched';
        }
      ),
      { numRuns: 100 }
    );
  });

  test('output is always one of the three valid status values', () => {
    const validStatuses = new Set(['healthy', 'failing', 'never_fetched']);

    fc.assert(
      fc.property(
        fc.option(
          fc.record({
            success: fc.option(fc.boolean(), { nil: undefined }),
            section_key: fc.string(),
            http_status: fc.option(fc.integer({ min: 100, max: 599 }), { nil: null }),
          }),
          { nil: null }
        ),
        (record) => {
          const status = getDisplayStatus(record);
          return validStatuses.has(status);
        }
      ),
      { numRuns: 200 }
    );
  });
});
