/**
 * Property-based tests for bookmarksSlice
 * Feature: bookmark-and-business-separator
 * Tasks: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createStore } from 'zustand';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import client from '@/api/client';
import { createBookmarksSlice, SavedItem } from '@/store/bookmarksSlice';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildBookmarksStore() {
  return createStore(createBookmarksSlice);
}

const TARGET_TYPES: SavedItem['target_type'][] = ['post', 'product', 'showroom', 'task'];

// Arbitrary generators
// Keys must never be Object.prototype danger keys ("__proto__", "constructor",
// "prototype"): assigning obj["__proto__"] mutates the prototype instead of
// creating an own property, which randomly breaks these object-shape
// properties depending on what fast-check generates.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const safeKeyArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter(s => !UNSAFE_KEYS.has(s));
const arbTargetId = safeKeyArb;
const arbTargetType = fc.constantFrom<SavedItem['target_type']>(...TARGET_TYPES);

/** Build an arbitrary savedIds map seeded into the store */
const arbSavedIdsRecord = fc.dictionary(
  safeKeyArb,
  fc.record({
    target_id: fc.string({ minLength: 1, maxLength: 40 }),
    target_type: arbTargetType,
  }),
).map((raw) => {
  // Normalise so each entry's target_id key == the map key
  const normalised: Record<string, SavedItem> = {};
  for (const [key, val] of Object.entries(raw)) {
    normalised[key] = { ...val, target_id: key };
  }
  return normalised;
});

// ─── Test Suite ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 9.1 — Property 4: isSaved reflects savedIds ─────────────────────────────

describe('Property 4: isSaved reflects savedIds', () => {
  // Feature: bookmark-and-business-separator, Property 4: isSaved reflects savedIds
  it('isSaved(targetId) returns true iff targetId is a key in savedIds', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSavedIdsRecord,
        arbTargetId,
        async (savedIds, targetId) => {
          const store = buildBookmarksStore();

          // Seed savedIds directly
          store.setState({ savedIds });

          const expected = Object.prototype.hasOwnProperty.call(savedIds, targetId);
          const actual = store.getState().isSaved(targetId);

          expect(actual).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 9.2 — Property 5: Hydrate populates savedIds from API response ───────────

describe('Property 5: Hydrate populates savedIds from API response', () => {
  // Feature: bookmark-and-business-separator, Property 5: Hydrate populates savedIds from API response
  it('after hydrate(), savedIds has exactly one entry per API record keyed by target_id', async () => {
    const arbRecord = fc.record({
      target_id: fc.string({ minLength: 1, maxLength: 40 }),
      target_type: arbTargetType,
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(arbRecord, { minLength: 0, maxLength: 20 }),
        async (records) => {
          const store = buildBookmarksStore();

          vi.mocked(client.get).mockResolvedValueOnce({ data: records });

          await store.getState().hydrate();

          const savedIds = store.getState().savedIds;

          // Exactly one entry per record (last-write-wins for duplicate target_ids)
          const uniqueIds = new Set(records.map((r) => r.target_id));
          expect(Object.keys(savedIds).length).toBe(uniqueIds.size);

          // Every record's target_id is present and isSaved returns true
          for (const record of records) {
            expect(savedIds[record.target_id]).toBeDefined();
            expect(store.getState().isSaved(record.target_id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 9.3 — Property 6: Toggle round-trip restores original state ──────────────

describe('Property 6: Toggle round-trip restores original state', () => {
  // Feature: bookmark-and-business-separator, Property 6: Toggle round-trip restores original state
  it('calling toggleSave twice with success restores savedIds to initial state', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSavedIdsRecord,
        arbTargetId,
        arbTargetType,
        async (savedIds, targetId, targetType) => {
          const store = buildBookmarksStore();
          store.setState({ savedIds });

          // Both API calls succeed
          vi.mocked(client.post)
            .mockResolvedValueOnce({ data: { saved: !Object.prototype.hasOwnProperty.call(savedIds, targetId) } })
            .mockResolvedValueOnce({ data: { saved: Object.prototype.hasOwnProperty.call(savedIds, targetId) } });

          const initialSavedIds = { ...store.getState().savedIds };

          await store.getState().toggleSave(targetId, targetType);
          await store.getState().toggleSave(targetId, targetType);

          const finalSavedIds = store.getState().savedIds;

          expect(Object.keys(finalSavedIds)).toEqual(Object.keys(initialSavedIds));
          for (const key of Object.keys(initialSavedIds)) {
            expect(finalSavedIds[key]).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 9.4 — Property 8: Rollback on API failure (store level) ─────────────────

describe('Property 8: Rollback on API failure (store level)', () => {
  // Feature: bookmark-and-business-separator, Property 8: Rollback on API failure
  it('on API failure, savedIds reverts to pre-call state and error is non-null', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSavedIdsRecord,
        arbTargetId,
        arbTargetType,
        async (savedIds, targetId, targetType) => {
          const store = buildBookmarksStore();
          store.setState({ savedIds, error: null });

          const snapshot = { ...store.getState().savedIds };

          vi.mocked(client.post).mockRejectedValueOnce(new Error('Network failure'));

          await store.getState().toggleSave(targetId, targetType);

          const afterSavedIds = store.getState().savedIds;
          const afterError = store.getState().error;

          // savedIds reverted to snapshot
          expect(Object.keys(afterSavedIds)).toEqual(Object.keys(snapshot));
          for (const key of Object.keys(snapshot)) {
            expect(afterSavedIds[key]).toBeDefined();
          }

          // error is non-null
          expect(afterError).not.toBeNull();
          expect(typeof afterError).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 9.5 — Property 9: Hydrate failure preserves savedIds ────────────────────

describe('Property 9: Hydrate failure preserves savedIds', () => {
  // Feature: bookmark-and-business-separator, Property 9: Hydrate failure preserves savedIds
  it('when hydrate() API call fails, savedIds is unchanged and error is non-null', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSavedIdsRecord,
        async (savedIds) => {
          const store = buildBookmarksStore();
          store.setState({ savedIds, error: null });

          const snapshot = { ...store.getState().savedIds };

          vi.mocked(client.get).mockRejectedValueOnce(new Error('Fetch failed'));

          await store.getState().hydrate();

          const afterSavedIds = store.getState().savedIds;
          const afterError = store.getState().error;

          // savedIds unchanged
          expect(Object.keys(afterSavedIds)).toEqual(Object.keys(snapshot));
          for (const key of Object.keys(snapshot)) {
            expect(afterSavedIds[key]).toBeDefined();
          }

          // error is non-null string
          expect(afterError).not.toBeNull();
          expect(typeof afterError).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 9.6 — Unit tests for edge cases ─────────────────────────────────────────

describe('Unit edge cases', () => {
  /**
   * Req 6.5: Bookmarks page mounts with empty store → hydrate() called once.
   *
   * We validate the guard condition: hydrate is a no-op if isHydrating is true
   * (concurrency guard) and is called normally when savedIds is empty.
   */
  it('Req 6.5: hydrate() is called once when store is empty (no concurrent guard triggered)', async () => {
    const store = buildBookmarksStore();

    // Empty initial state — savedIds is {} and isHydrating is false
    expect(Object.keys(store.getState().savedIds)).toHaveLength(0);
    expect(store.getState().isHydrating).toBe(false);

    vi.mocked(client.get).mockResolvedValueOnce({ data: [] });

    await store.getState().hydrate();

    // client.get was called exactly once
    expect(vi.mocked(client.get)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(client.get)).toHaveBeenCalledWith('/api/saves');
  });

  /**
   * Req 6.5 (duplicate guard): A second concurrent call to hydrate() while
   * isHydrating is true must be a no-op (client.get is not called again).
   */
  it('Req 6.5: concurrent hydrate() calls are de-duplicated via isHydrating guard', async () => {
    const store = buildBookmarksStore();

    // Make the first call hang indefinitely so isHydrating stays true
    let resolveFetch!: (v: any) => void;
    vi.mocked(client.get).mockReturnValueOnce(
      new Promise((res) => { resolveFetch = res; })
    );

    // Start first hydrate (does not await yet)
    const firstCall = store.getState().hydrate();

    // isHydrating should now be true
    expect(store.getState().isHydrating).toBe(true);

    // Second call should return immediately without calling client.get again
    await store.getState().hydrate();

    expect(vi.mocked(client.get)).toHaveBeenCalledTimes(1);

    // Resolve the first call so the store settles
    resolveFetch({ data: [] });
    await firstCall;
  });

  /**
   * Req 2.4: In-flight disabled — no duplicate toggleSave requests.
   *
   * BookmarkButton tracks isPending locally (not in the store), but the store
   * itself must process each toggleSave independently. Here we verify that two
   * sequential toggleSave calls each trigger their own client.post call —
   * confirming the store doesn't silently drop calls. The UI layer (BookmarkButton)
   * is responsible for preventing the second call while isPending is true.
   *
   * We confirm the store behaviour: a single toggleSave triggers exactly one
   * client.post call. Two sequential calls trigger two.
   */
  it('Req 2.4: each toggleSave triggers exactly one API call (no accidental deduplication in store)', async () => {
    const store = buildBookmarksStore();

    vi.mocked(client.post)
      .mockResolvedValueOnce({ data: { saved: true } })
      .mockResolvedValueOnce({ data: { saved: false } });

    await store.getState().toggleSave('item-1', 'post');
    expect(vi.mocked(client.post)).toHaveBeenCalledTimes(1);

    await store.getState().toggleSave('item-1', 'post');
    expect(vi.mocked(client.post)).toHaveBeenCalledTimes(2);
  });
});
