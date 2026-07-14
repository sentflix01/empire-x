'use strict';

/**
 * Unit tests for resolveDotPath and applyMappings, exported from
 * backend/services/proxyGateway.js
 *
 * Validates: Requirements 3.5, 3.6, 3.8, 11.1, 11.3
 * Design refs: Testing Strategy → Unit Tests (fieldMapper.test.js)
 */

const { resolveDotPath, applyMappings } = require('../services/proxyGateway');

// ─────────────────────────────────────────────────────────────────────────────
// resolveDotPath
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveDotPath', () => {
  // ── Simple / single-segment keys ──────────────────────────────────────────

  describe('simple keys', () => {
    test('returns value for a top-level key', () => {
      expect(resolveDotPath({ name: 'Widget' }, 'name')).toBe('Widget');
    });

    test('returns numeric value', () => {
      expect(resolveDotPath({ price: 9.99 }, 'price')).toBe(9.99);
    });

    test('returns boolean value', () => {
      expect(resolveDotPath({ active: false }, 'active')).toBe(false);
    });

    test('returns null value (key exists, value is null)', () => {
      expect(resolveDotPath({ key: null }, 'key')).toBe(null);
    });

    test('returns 0 (falsy but present)', () => {
      expect(resolveDotPath({ count: 0 }, 'count')).toBe(0);
    });

    test('returns empty string (falsy but present)', () => {
      expect(resolveDotPath({ label: '' }, 'label')).toBe('');
    });
  });

  // ── Multi-level / nested paths ────────────────────────────────────────────

  describe('multi-level paths', () => {
    test('resolves a two-level path', () => {
      expect(resolveDotPath({ a: { b: 42 } }, 'a.b')).toBe(42);
    });

    test('resolves a three-level path', () => {
      expect(resolveDotPath({ product: { details: { price: 19.5 } } }, 'product.details.price'))
        .toBe(19.5);
    });

    test('resolves a four-level path', () => {
      const obj = { x: { y: { z: { w: 'deep' } } } };
      expect(resolveDotPath(obj, 'x.y.z.w')).toBe('deep');
    });

    test('resolves path to a nested object (not a leaf)', () => {
      const inner = { c: 1 };
      expect(resolveDotPath({ a: { b: inner } }, 'a.b')).toEqual(inner);
    });

    test('resolves path to a nested array', () => {
      expect(resolveDotPath({ items: [1, 2, 3] }, 'items')).toEqual([1, 2, 3]);
    });
  });

  // ── Missing segments ──────────────────────────────────────────────────────

  describe('missing segments', () => {
    test('returns undefined for a missing top-level key', () => {
      expect(resolveDotPath({ a: 1 }, 'b')).toBeUndefined();
    });

    test('returns undefined when an intermediate segment is missing', () => {
      expect(resolveDotPath({ a: { c: 1 } }, 'a.b.c')).toBeUndefined();
    });

    test('returns undefined when intermediate segment is null', () => {
      expect(resolveDotPath({ a: null }, 'a.b')).toBeUndefined();
    });

    test('returns undefined when intermediate segment is a primitive', () => {
      expect(resolveDotPath({ a: 42 }, 'a.b')).toBeUndefined();
    });

    test('returns undefined for empty path string', () => {
      expect(resolveDotPath({ a: 1 }, '')).toBeUndefined();
    });

    test('returns undefined when obj is null', () => {
      expect(resolveDotPath(null, 'a')).toBeUndefined();
    });

    test('returns undefined when obj is undefined', () => {
      expect(resolveDotPath(undefined, 'a')).toBeUndefined();
    });

    test('returns undefined when obj is a string (not an object)', () => {
      expect(resolveDotPath('hello', 'length')).toBeUndefined();
    });

    test('returns undefined when obj is a number', () => {
      expect(resolveDotPath(42, 'toString')).toBeUndefined();
    });

    test('returns undefined when path is not a string', () => {
      expect(resolveDotPath({ a: 1 }, null)).toBeUndefined();
      expect(resolveDotPath({ a: 1 }, undefined)).toBeUndefined();
      expect(resolveDotPath({ a: 1 }, 123)).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applyMappings
// ─────────────────────────────────────────────────────────────────────────────

describe('applyMappings', () => {
  // ── Flat objects ──────────────────────────────────────────────────────────

  describe('flat objects', () => {
    test('maps a single field from a flat object', () => {
      const items = [{ name: 'Widget', price: 9.99 }];
      const mappings = [{ source_path: 'name', target_field: 'title' }];
      expect(applyMappings(items, mappings)).toEqual([{ title: 'Widget' }]);
    });

    test('maps multiple fields from a flat object', () => {
      const items = [{ product_name: 'Gadget', retail_price: 29.99, sku: 'ABC' }];
      const mappings = [
        { source_path: 'product_name', target_field: 'name' },
        { source_path: 'retail_price', target_field: 'price' },
      ];
      const result = applyMappings(items, mappings);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'Gadget', price: 29.99 });
    });

    test('handles multiple items', () => {
      const items = [
        { n: 'A', p: 1 },
        { n: 'B', p: 2 },
      ];
      const mappings = [
        { source_path: 'n', target_field: 'name' },
        { source_path: 'p', target_field: 'price' },
      ];
      const result = applyMappings(items, mappings);
      expect(result).toEqual([
        { name: 'A', price: 1 },
        { name: 'B', price: 2 },
      ]);
    });
  });

  // ── Nested dot-notation ───────────────────────────────────────────────────

  describe('nested dot-notation paths', () => {
    test('maps a two-level nested path', () => {
      const items = [{ product: { name: 'Widget', price: 9.99 } }];
      const mappings = [
        { source_path: 'product.name', target_field: 'title' },
        { source_path: 'product.price', target_field: 'cost' },
      ];
      const result = applyMappings(items, mappings);
      expect(result).toEqual([{ cost: 9.99, title: 'Widget' }]);
    });

    test('maps a three-level nested path', () => {
      const items = [{ a: { b: { c: 'deep_value' } } }];
      const mappings = [{ source_path: 'a.b.c', target_field: 'label' }];
      expect(applyMappings(items, mappings)).toEqual([{ label: 'deep_value' }]);
    });
  });

  // ── Missing source paths ──────────────────────────────────────────────────

  describe('missing source paths', () => {
    test('omits target field when source path is missing', () => {
      const items = [{ name: 'Widget' }];
      const mappings = [
        { source_path: 'name', target_field: 'title' },
        { source_path: 'missing_field', target_field: 'subtitle' },
      ];
      const result = applyMappings(items, mappings);
      expect(result).toEqual([{ title: 'Widget' }]);
      expect(result[0]).not.toHaveProperty('subtitle');
    });

    test('returns empty object when all source paths are missing', () => {
      const items = [{ name: 'Widget' }];
      const mappings = [
        { source_path: 'no_such_a', target_field: 'a' },
        { source_path: 'no_such_b', target_field: 'b' },
      ];
      expect(applyMappings(items, mappings)).toEqual([{}]);
    });

    test('handles items where some have the path and some do not', () => {
      const items = [{ price: 10 }, { name: 'Widget' }];
      const mappings = [{ source_path: 'price', target_field: 'cost' }];
      const result = applyMappings(items, mappings);
      expect(result[0]).toEqual({ cost: 10 });
      expect(result[1]).toEqual({});
    });
  });

  // ── Extra / unmapped fields ───────────────────────────────────────────────

  describe('extra unmapped fields', () => {
    test('discards source fields not covered by any mapping', () => {
      const items = [{ name: 'Widget', secret: 'do-not-expose', internal_id: 99 }];
      const mappings = [{ source_path: 'name', target_field: 'title' }];
      const result = applyMappings(items, mappings);
      expect(result[0]).toHaveProperty('title', 'Widget');
      expect(result[0]).not.toHaveProperty('secret');
      expect(result[0]).not.toHaveProperty('internal_id');
    });

    test('output contains ONLY mapped target fields', () => {
      const items = [{ a: 1, b: 2, c: 3, d: 4, e: 5 }];
      const mappings = [
        { source_path: 'a', target_field: 'alpha' },
        { source_path: 'c', target_field: 'gamma' },
      ];
      const result = applyMappings(items, mappings);
      expect(Object.keys(result[0]).sort()).toEqual(['alpha', 'gamma']);
    });
  });

  // ── Alphabetical ordering of output keys ──────────────────────────────────

  describe('alphabetical ordering of output keys', () => {
    test('output keys are in alphabetical order by target_field regardless of mapping order', () => {
      const items = [{ z: 26, a: 1, m: 13 }];
      const mappings = [
        { source_path: 'z', target_field: 'zebra' },
        { source_path: 'a', target_field: 'apple' },
        { source_path: 'm', target_field: 'mango' },
      ];
      const result = applyMappings(items, mappings);
      expect(Object.keys(result[0])).toEqual(['apple', 'mango', 'zebra']);
    });

    test('output key order is stable regardless of source object property order', () => {
      const items = [{ price: 9.99, name: 'Widget', desc: 'A thing' }];
      const mappings = [
        { source_path: 'price', target_field: 'cost' },
        { source_path: 'name', target_field: 'title' },
        { source_path: 'desc', target_field: 'description' },
      ];
      const result = applyMappings(items, mappings);
      expect(Object.keys(result[0])).toEqual(['cost', 'description', 'title']);
    });

    test('applying applyMappings twice produces identical output (determinism)', () => {
      const items = [{ x: 1, y: 2, z: 3 }];
      const mappings = [
        { source_path: 'x', target_field: 'c_field' },
        { source_path: 'y', target_field: 'a_field' },
        { source_path: 'z', target_field: 'b_field' },
      ];
      const first = applyMappings(items, mappings);
      const second = applyMappings(items, mappings);
      expect(first).toEqual(second);
      expect(Object.keys(first[0])).toEqual(Object.keys(second[0]));
    });
  });

  // ── Array response unwrapping ──────────────────────────────────────────────
  // Note: the unwrapping from JSON body to items[] is done in fetchSection;
  // applyMappings itself receives a pre-unwrapped array. These tests verify
  // that applyMappings correctly handles arrays of items.

  describe('array of items', () => {
    test('applies mappings to each element of an array', () => {
      const items = [
        { product_name: 'Widget', price: 9.99 },
        { product_name: 'Gadget', price: 19.99 },
        { product_name: 'Doohickey', price: 4.99 },
      ];
      const mappings = [
        { source_path: 'product_name', target_field: 'name' },
        { source_path: 'price', target_field: 'cost' },
      ];
      const result = applyMappings(items, mappings);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ cost: 9.99, name: 'Widget' });
      expect(result[1]).toEqual({ cost: 19.99, name: 'Gadget' });
      expect(result[2]).toEqual({ cost: 4.99, name: 'Doohickey' });
    });

    test('returns empty array when items array is empty', () => {
      const mappings = [{ source_path: 'name', target_field: 'title' }];
      expect(applyMappings([], mappings)).toEqual([]);
    });

    test('returns empty array when items is not an array', () => {
      const mappings = [{ source_path: 'name', target_field: 'title' }];
      expect(applyMappings(null, mappings)).toEqual([]);
      expect(applyMappings(undefined, mappings)).toEqual([]);
      expect(applyMappings({}, mappings)).toEqual([]);
    });

    test('returns array of empty objects when mappings array is empty', () => {
      const items = [{ name: 'Widget' }, { name: 'Gadget' }];
      expect(applyMappings(items, [])).toEqual([{}, {}]);
    });

    test('returns array of empty objects when mappings is null', () => {
      const items = [{ name: 'Widget' }];
      // No mappings means no fields to extract — returns array of empty objects
      // (consistent with the empty-mappings behavior: items exist but nothing maps)
      expect(applyMappings(items, null)).toEqual([{}]);
    });
  });

  // ── Wrapped-array response unwrapping verification ────────────────────────
  // applyMappings receives the unwrapped items array. Verify it processes
  // items extracted from a single-key wrapper correctly.

  describe('wrapped-array pattern (items pre-unwrapped)', () => {
    test('processes items extracted from a { data: [...] } wrapper correctly', () => {
      // In real usage, fetchSection unwraps { data: [...] } to just the array
      // before calling applyMappings. This test ensures applyMappings handles
      // such items properly once they are unwrapped.
      const wrappedBody = { data: [{ title: 'A' }, { title: 'B' }] };
      const unwrappedItems = wrappedBody.data; // as fetchSection would do
      const mappings = [{ source_path: 'title', target_field: 'name' }];
      expect(applyMappings(unwrappedItems, mappings)).toEqual([
        { name: 'A' },
        { name: 'B' },
      ]);
    });

    test('processes items extracted from a { results: [...] } wrapper correctly', () => {
      const wrappedBody = { results: [{ id: 1, label: 'First' }, { id: 2, label: 'Second' }] };
      const items = wrappedBody.results;
      const mappings = [
        { source_path: 'id', target_field: 'uid' },
        { source_path: 'label', target_field: 'name' },
      ];
      const result = applyMappings(items, mappings);
      expect(result).toEqual([
        { name: 'First', uid: 1 },
        { name: 'Second', uid: 2 },
      ]);
    });
  });

  // ── Does not mutate inputs ─────────────────────────────────────────────────

  describe('immutability', () => {
    test('does not mutate the original items array', () => {
      const items = [{ name: 'Widget', price: 9.99 }];
      const originalItem = { ...items[0] };
      const mappings = [{ source_path: 'name', target_field: 'title' }];
      applyMappings(items, mappings);
      expect(items[0]).toEqual(originalItem);
    });

    test('does not mutate the original mappings array', () => {
      const mappings = [
        { source_path: 'z', target_field: 'zebra' },
        { source_path: 'a', target_field: 'apple' },
      ];
      const originalOrder = mappings.map((m) => m.target_field);
      applyMappings([{ z: 1, a: 2 }], mappings);
      expect(mappings.map((m) => m.target_field)).toEqual(originalOrder);
    });
  });
});
