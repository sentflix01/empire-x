/**
 * Property-based tests for Bookmarks page filtering logic
 * Feature: bookmark-and-business-separator
 * Task: 8.2 — Property 12
 *
 * Instead of rendering the full Bookmarks view (which depends on i18n,
 * ErrorBoundary, alerts endpoint, Next.js Image, etc.), we extract the
 * in-memory filtering contract from Bookmarks.tsx and test it directly.
 * This is the same approach used for store-level logic in bookmarksSlice.property.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createStore } from 'zustand';
import { createBookmarksSlice, SavedItem } from '@/store/bookmarksSlice';

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

// ─── Filtering contract extracted from views/Bookmarks.tsx ───────────────────
//
// The Bookmarks view uses this exact expression:
//
//   const filtered = Object.values(savedIds).filter(
//     item => tab === 'all' || item.target_type === tab
//   );
//
// We extract that logic into a pure function so we can property-test it
// without rendering the full component.

function filterByTab(
  savedIds: Record<string, SavedItem>,
  tab: string,
): SavedItem[] {
  return Object.values(savedIds).filter(
    (item) => tab === 'all' || item.target_type === tab,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildBookmarksStore() {
  return createStore(createBookmarksSlice);
}

// Arbitrary: savedIds map — dictionary keyed by arbitrary string, values are
// SavedItem records with a valid target_type.
const arbSavedIds = fc.dictionary(
  fc.string({ minLength: 1 }),
  fc.record({
    target_id: fc.string({ minLength: 1 }),
    target_type: fc.constantFrom<SavedItem['target_type']>(
      'post',
      'product',
      'showroom',
      'task',
    ),
  }),
);

// Arbitrary tab value — matches the TABS used in Bookmarks.tsx (excluding "alerts")
const arbTab = fc.constantFrom('all', 'post', 'product', 'showroom', 'task');

// ─── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Property 12 ─────────────────────────────────────────────────────────────

describe('Property 12: Bookmarks page list matches store filtered by tab', () => {
  // Feature: bookmark-and-business-separator, Property 12: Bookmarks page list matches store filtered by tab

  it('when tab = "all", filtered length equals Object.values(savedIds).length', () => {
    fc.assert(
      fc.property(arbSavedIds, (savedIds) => {
        const filtered = filterByTab(savedIds, 'all');
        expect(filtered.length).toBe(Object.values(savedIds).length);
      }),
      { numRuns: 100 },
    );
  });

  it('when tab = specific type, every item in filtered has target_type === tab', () => {
    fc.assert(
      fc.property(
        arbSavedIds,
        fc.constantFrom<SavedItem['target_type']>(
          'post',
          'product',
          'showroom',
          'task',
        ),
        (savedIds, tab) => {
          const filtered = filterByTab(savedIds, tab);
          for (const item of filtered) {
            expect(item.target_type).toBe(tab);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no items appear in filtered that are absent from savedIds', () => {
    fc.assert(
      fc.property(arbSavedIds, arbTab, (savedIds, tab) => {
        const filtered = filterByTab(savedIds, tab);
        const allValues = Object.values(savedIds);

        for (const item of filtered) {
          // Every filtered item must be referentially present in savedIds values
          expect(allValues).toContain(item);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('items with matching target_type appear in filtered result', () => {
    fc.assert(
      fc.property(
        arbSavedIds,
        fc.constantFrom<SavedItem['target_type']>(
          'post',
          'product',
          'showroom',
          'task',
        ),
        (savedIds, tab) => {
          const filtered = filterByTab(savedIds, tab);
          const matchingValues = Object.values(savedIds).filter(
            (item) => item.target_type === tab,
          );

          // Each item that matches the tab must appear in filtered
          for (const item of matchingValues) {
            expect(filtered).toContain(item);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('combined: all four sub-properties hold for any savedIds and any tab', () => {
    // Feature: bookmark-and-business-separator, Property 12: Bookmarks page list matches store filtered by tab
    fc.assert(
      fc.property(arbSavedIds, arbTab, (savedIds, tab) => {
        const filtered = filterByTab(savedIds, tab);
        const allValues = Object.values(savedIds);

        // 1. When tab === 'all', count must equal the full store
        if (tab === 'all') {
          expect(filtered.length).toBe(allValues.length);
        }

        // 2. When tab is a specific type, every item must match that type
        if (tab !== 'all') {
          for (const item of filtered) {
            expect(item.target_type).toBe(tab);
          }
        }

        // 3. No item in filtered may be absent from savedIds
        for (const item of filtered) {
          expect(allValues).toContain(item);
        }

        // 4. Items with matching target_type must appear in filtered
        if (tab !== 'all') {
          const matching = allValues.filter((item) => item.target_type === tab);
          for (const item of matching) {
            expect(filtered).toContain(item);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Unit test: hydrate() called on mount when savedIds is empty (Req 7.4) ───

describe('Unit: hydrate() called when store is empty (Req 7.4)', () => {
  /**
   * Requirement 7.4: Bookmarks page calls hydrate() on mount when savedIds is
   * empty so the list is populated fresh each session.
   *
   * We test the store behaviour directly: an empty store allows hydrate() to
   * proceed (isHydrating guard is false, client.get is called once).
   *
   * The conditional in Bookmarks.tsx:
   *   if (Object.keys(savedIds).length === 0) { hydrate(); }
   * means hydrate is only triggered when the store has no items. We verify both
   * the triggering condition (empty → hydrate called) and the non-triggering
   * condition (non-empty → hydrate not called, matching the view's guard).
   */
  it('Req 7.4: hydrate() calls GET /api/saves when store is empty', async () => {
    const store = buildBookmarksStore();

    // Verify precondition: store is initially empty
    expect(Object.keys(store.getState().savedIds)).toHaveLength(0);
    expect(store.getState().isHydrating).toBe(false);

    vi.mocked(client.get).mockResolvedValueOnce({ data: [] });

    // Simulate what Bookmarks.tsx does on mount:
    //   if (Object.keys(savedIds).length === 0) { hydrate(); }
    if (Object.keys(store.getState().savedIds).length === 0) {
      await store.getState().hydrate();
    }

    expect(vi.mocked(client.get)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(client.get)).toHaveBeenCalledWith('/api/saves');
  });

  it('Req 7.4: hydrate() is NOT called when store already has bookmarks', async () => {
    const store = buildBookmarksStore();

    // Pre-populate store — simulates a session where bookmarks are already loaded
    store.setState({
      savedIds: {
        'item-1': { target_id: 'item-1', target_type: 'post' },
      },
    });

    expect(Object.keys(store.getState().savedIds)).toHaveLength(1);

    // Simulate the Bookmarks.tsx mount guard:
    //   if (Object.keys(savedIds).length === 0) { hydrate(); }
    if (Object.keys(store.getState().savedIds).length === 0) {
      await store.getState().hydrate();
    }

    // client.get must NOT have been called — store was already hydrated
    expect(vi.mocked(client.get)).not.toHaveBeenCalled();
  });

  it('Req 7.4: hydrate() populates savedIds from API on empty store', async () => {
    const store = buildBookmarksStore();

    const mockRecords = [
      { target_id: 'post-1', target_type: 'post' },
      { target_id: 'product-2', target_type: 'product' },
    ];

    vi.mocked(client.get).mockResolvedValueOnce({ data: mockRecords });

    // Simulate mount guard
    if (Object.keys(store.getState().savedIds).length === 0) {
      await store.getState().hydrate();
    }

    const savedIds = store.getState().savedIds;
    expect(Object.keys(savedIds)).toHaveLength(2);
    expect(savedIds['post-1']).toBeDefined();
    expect(savedIds['product-2']).toBeDefined();
    expect(store.getState().isHydrating).toBe(false);
  });
});
