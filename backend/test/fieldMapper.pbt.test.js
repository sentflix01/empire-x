'use strict';

/**
 * fieldMapper.pbt.test.js — Property-based tests for field mapper
 *
 * Feature: showroom-external-api
 *
 * Covers:
 *   Property 5: Exact output key set
 *   Property 6: Dot-notation path resolution
 *   Property 7: Mapping serialization round-trip
 *   Property 8: Transformation determinism + alphabetical order
 *   Property 9: Array and wrapped-array response handling
 *
 * Requirements: 3.5, 3.8, 11.1, 11.2, 11.3, 4.10, 4.11
 * Design refs: Testing Strategy → PBT table, Properties 5, 6, 7, 8, 9
 */

const fc = require('fast-check');
const { resolveDotPath, applyMappings } = require('../services/proxyGateway');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collect all dot-notation paths from a (possibly nested) object, up to
 * maxDepth levels deep. Returns an array of path strings like "a", "a.b",
 * "a.b.c" etc.  Arrays are skipped so paths always resolve to a scalar or
 * plain object.
 *
 * Only keys that are non-empty strings and contain no dots are included —
 * this matches the assumption that resolveDotPath splits on "." to navigate
 * segments, so keys with embedded dots or empty-string keys would not resolve
 * correctly via dot-notation.
 */
function collectPaths(obj, prefix, depth) {
  if (depth === 0 || obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return [];
  }
  const paths = [];
  for (const key of Object.keys(obj)) {
    // Skip empty-string keys or keys containing dots — they cannot be
    // addressed reliably via dot-notation path segments.
    if (key.length === 0 || key.includes('.')) continue;

    const fullPath = prefix ? `${prefix}.${key}` : key;
    paths.push(fullPath);
    const child = obj[key];
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      paths.push(...collectPaths(child, fullPath, depth - 1));
    }
  }
  return paths;
}

/**
 * Unwrap the JSON body the same way fetchSection does:
 *   - Array → use directly
 *   - Object with exactly one key whose value is an array → unwrap that array
 *   - Anything else → wrap in a single-element array
 */
function unwrapBody(body) {
  if (Array.isArray(body)) return body;
  if (body !== null && typeof body === 'object') {
    const keys = Object.keys(body);
    if (keys.length === 1 && Array.isArray(body[keys[0]])) {
      return body[keys[0]];
    }
    return [body];
  }
  return [body];
}

// ─────────────────────────────────────────────────────────────────────────────
// Arbitraries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A field-mapping array arbitrary: each element has source_path and target_field
 * as non-empty strings so they can actually be used as object keys.
 */
const mappingsArb = fc.array(
  fc.record({
    source_path: fc.string({ minLength: 1 }),
    target_field: fc.string({ minLength: 1 }),
  }),
  { minLength: 1 },
);

/**
 * A flat-ish source object arbitrary. We use maxDepth:2 so dot-paths remain
 * reasonable and JSON round-trips are safe.
 */
const objectArb = fc.object({ maxDepth: 2 });

// ─────────────────────────────────────────────────────────────────────────────
// Property 5: Exact output key set
// ─────────────────────────────────────────────────────────────────────────────
// Feature: showroom-external-api, Property 5: Exact output key set

describe('Property 5 — Exact output key set', () => {
  /**
   * For any source object and any non-empty mapping set, every key in each
   * output object MUST come from a target_field in the mapping, and no
   * key from the original source object that is not a target_field may
   * appear in the output.
   *
   * A target_field appears in the output IFF its source_path exists on that
   * item (undefined source paths are silently omitted).
   *
   * Validates: Requirements 3.5, 7.1, 7.2
   */
  test('output keys are exactly the target_fields whose source_paths exist', () => {
    fc.assert(
      fc.property(objectArb, mappingsArb, (sourceObj, mappings) => {
        const result = applyMappings([sourceObj], mappings);
        expect(result).toHaveLength(1);
        const outputObj = result[0];
        const outputKeys = Object.keys(outputObj);

        // Every output key must be a target_field from the mapping set
        const allTargetFields = new Set(mappings.map((m) => m.target_field));
        for (const key of outputKeys) {
          expect(allTargetFields.has(key)).toBe(true);
        }

        // Every target_field whose source_path resolves to a non-undefined value
        // must appear in the output
        for (const { source_path, target_field } of mappings) {
          const value = resolveDotPath(sourceObj, source_path);
          if (value !== undefined) {
            expect(outputKeys).toContain(target_field);
          }
        }

        // No keys from the source object that are not target_fields may appear
        for (const key of outputKeys) {
          expect(allTargetFields.has(key)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 6: Dot-notation path resolution
// ─────────────────────────────────────────────────────────────────────────────
// Feature: showroom-external-api, Property 6: Dot-notation path resolution

describe('Property 6 — Dot-notation path resolution', () => {
  /**
   * For any object, all paths derived from the object's own structure MUST
   * resolve to a non-undefined value. Paths that do not exist on the object
   * MUST resolve to undefined.
   *
   * Validates: Requirements 3.8
   */
  test('resolveDotPath returns the value at an existing derived path', () => {
    // Use maxDepth:2 to keep generated objects manageable.
    // We use fc.object() with key constraints to avoid keys that cannot be
    // addressed by dot-notation (empty strings, strings containing dots, or
    // keys whose values are undefined — resolveDotPath correctly returns
    // undefined for undefined values, so we exclude them from our path set).
    fc.assert(
      fc.property(fc.object({ maxDepth: 2 }), (obj) => {
        const paths = collectPaths(obj, '', 3);

        // If the object has no addressable paths, the property is vacuously satisfied
        if (paths.length === 0) return;

        for (const path of paths) {
          // Manually resolve the path to get the expected value
          const segments = path.split('.');
          let manual = obj;
          for (const seg of segments) {
            if (manual === null || typeof manual !== 'object') {
              manual = undefined;
              break;
            }
            manual = manual[seg];
          }

          // Only assert on paths where the stored value is not undefined.
          // A key CAN exist with value undefined (e.g. {" ": undefined}), in
          // which case resolveDotPath correctly returns undefined too — that
          // is valid behaviour and not a bug, so we skip those paths.
          if (manual === undefined) continue;

          const resolved = resolveDotPath(obj, path);
          expect(resolved).toBe(manual);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('resolveDotPath returns undefined for paths that do not exist on the object', () => {
    // Generate a path by appending a guaranteed-absent suffix to an existing key
    fc.assert(
      fc.property(
        fc.object({ maxDepth: 2 }),
        fc.string({ minLength: 1 }),
        (obj, suffix) => {
          // Build a path that definitely does not exist: append a unique suffix
          // to a segment that is guaranteed not to be a key
          const impossiblePath = `__nonexistent_${suffix}__`;
          const result = resolveDotPath(obj, impossiblePath);
          expect(result).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 7: Mapping serialization round-trip
// ─────────────────────────────────────────────────────────────────────────────
// Feature: showroom-external-api, Property 7: Mapping serialization round-trip

describe('Property 7 — Mapping serialization round-trip', () => {
  /**
   * For any mapping array and any source object, serialising the mappings
   * with JSON.stringify and deserialising with JSON.parse MUST produce a set
   * of mappings that generates an identical Mapped_Response from the same
   * source object.
   *
   * Validates: Requirements 11.2
   */
  test('JSON round-trip of mappings produces identical Mapped_Response', () => {
    fc.assert(
      fc.property(objectArb, mappingsArb, (sourceObj, mappings) => {
        // Original result
        const original = applyMappings([sourceObj], mappings);

        // Round-trip the mappings through JSON
        const roundTrippedMappings = JSON.parse(JSON.stringify(mappings));
        const roundTripped = applyMappings([sourceObj], roundTrippedMappings);

        expect(roundTripped).toEqual(original);
        // Also verify key order is preserved
        expect(Object.keys(roundTripped[0])).toEqual(Object.keys(original[0]));
      }),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 8: Transformation determinism + alphabetical order
// ─────────────────────────────────────────────────────────────────────────────
// Feature: showroom-external-api, Property 8: Transformation determinism + alphabetical order

describe('Property 8 — Transformation determinism + alphabetical order', () => {
  /**
   * Calling applyMappings any number of times with the same inputs MUST
   * produce structurally identical Mapped_Response objects.
   *
   * Output keys MUST appear in alphabetical order by target_field regardless
   * of the order the mappings were originally provided.
   *
   * Validates: Requirements 11.1, 11.3
   */
  test('applyMappings is deterministic: two calls produce identical output', () => {
    fc.assert(
      fc.property(objectArb, mappingsArb, (sourceObj, mappings) => {
        const first = applyMappings([sourceObj], mappings);
        const second = applyMappings([sourceObj], mappings);

        expect(first).toEqual(second);
        // Key order must also be identical
        expect(Object.keys(first[0])).toEqual(Object.keys(second[0]));
      }),
      { numRuns: 100 },
    );
  });

  test('output keys are in alphabetical order by target_field', () => {
    fc.assert(
      fc.property(objectArb, mappingsArb, (sourceObj, mappings) => {
        const result = applyMappings([sourceObj], mappings);
        const outputKeys = Object.keys(result[0]);

        // Verify they are sorted alphabetically
        const sortedKeys = outputKeys.slice().sort();
        expect(outputKeys).toEqual(sortedKeys);
      }),
      { numRuns: 100 },
    );
  });

  test('output key order is alphabetical regardless of mapping order', () => {
    // Explicitly shuffle mappings and confirm the output is still sorted
    fc.assert(
      fc.property(
        objectArb,
        mappingsArb,
        fc.integer({ min: 0, max: 99 }), // seed for shuffle
        (sourceObj, mappings, seed) => {
          // Deterministic "shuffle" using the seed
          const shuffled = mappings
            .map((m, i) => ({ m, sort: (i * seed * 1013) % (mappings.length + 1) }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ m }) => m);

          const resultOriginal = applyMappings([sourceObj], mappings);
          const resultShuffled = applyMappings([sourceObj], shuffled);

          // Both runs must produce the same key order (alphabetical)
          expect(Object.keys(resultOriginal[0])).toEqual(
            Object.keys(resultOriginal[0]).slice().sort(),
          );
          expect(Object.keys(resultShuffled[0])).toEqual(
            Object.keys(resultShuffled[0]).slice().sort(),
          );

          // And the overall results must be equal (same mapping set, just reordered)
          expect(resultOriginal).toEqual(resultShuffled);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 9: Array and wrapped-array response handling
// ─────────────────────────────────────────────────────────────────────────────
// Feature: showroom-external-api, Property 9: Array and wrapped-array response handling

describe('Property 9 — Array and wrapped-array response handling', () => {
  /**
   * If the body is a JSON array, applyMappings is applied to each element
   * individually and returns an array of the same length (elements where all
   * source paths are absent produce empty objects, not dropped entries).
   *
   * If the body is an object with exactly one key whose value is an array,
   * the gateway unwraps that inner array and applies per-element mapping —
   * the result is identical to applying applyMappings directly on the
   * inner array.
   *
   * Validates: Requirements 4.10, 4.11
   */
  test('plain array body: applyMappings applies to each element individually', () => {
    fc.assert(
      fc.property(
        fc.array(fc.object({ maxDepth: 2 }), { minLength: 0, maxLength: 20 }),
        mappingsArb,
        (items, mappings) => {
          const result = applyMappings(items, mappings);

          // Result length must match input length
          expect(result).toHaveLength(items.length);

          // Each output element must only contain target_field keys
          const allTargetFields = new Set(mappings.map((m) => m.target_field));
          for (const outputItem of result) {
            for (const key of Object.keys(outputItem)) {
              expect(allTargetFields.has(key)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test('wrapped-array body: unwrapping then mapping equals direct array mapping', () => {
    // Generate a body shaped as { <singleKey>: [ ...items ] }
    const wrappedBodyArb = fc.record({
      items: fc.array(fc.object({ maxDepth: 2 }), { minLength: 0, maxLength: 20 }),
    });

    fc.assert(
      fc.property(wrappedBodyArb, mappingsArb, (wrappedBody, mappings) => {
        // Simulate what fetchSection does: unwrap via the single-key-array rule
        const unwrapped = unwrapBody(wrappedBody); // → wrappedBody.items (the array)

        // Apply mappings on the unwrapped array
        const resultViaUnwrap = applyMappings(unwrapped, mappings);

        // Apply mappings directly on the inner array (ground truth)
        const resultDirect = applyMappings(wrappedBody.items, mappings);

        expect(resultViaUnwrap).toEqual(resultDirect);
        expect(resultViaUnwrap).toHaveLength(wrappedBody.items.length);
      }),
      { numRuns: 100 },
    );
  });

  test('unwrapBody produces the same items for plain-array and wrapped-array bodies', () => {
    fc.assert(
      fc.property(
        fc.array(fc.object({ maxDepth: 2 }), { minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 1 }),
        (items, wrapperKey) => {
          // Direct array body
          const arrayBody = items;
          const fromArray = unwrapBody(arrayBody);
          expect(fromArray).toEqual(items);

          // Wrapped body with exactly one key
          const wrappedBody = { [wrapperKey]: items };
          const fromWrapped = unwrapBody(wrappedBody);
          expect(fromWrapped).toEqual(items);

          // Both paths produce the same items and therefore the same mapping result
          const mappings = [{ source_path: '__sentinel__', target_field: 'x' }];
          expect(applyMappings(fromArray, mappings)).toEqual(
            applyMappings(fromWrapped, mappings),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
