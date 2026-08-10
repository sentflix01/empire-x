/**
 * Property-based tests for BookmarkButton component
 * Feature: bookmark-and-business-separator
 * Tasks: 2.2 (Properties 10 & 11), 2.3 (Properties 7 & 8)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, within } from '@testing-library/react';
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

vi.mock('lucide-react', () => ({
  Bookmark: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="bookmark-icon" {...props} />,
}));

// ─── Mock @/store — returns a factory so each test can provide its own store ──

// We store a reference to the current test store instance so the mock can
// delegate to it.  Each property-test iteration replaces this reference.
let _testStore: ReturnType<typeof buildBookmarksStore> | null = null;

vi.mock('@/store', () => {
  // Proxy that always reads from the currently-active _testStore
  const useAppStore = (selector: (s: any) => any) => {
    if (!_testStore) throw new Error('No test store mounted');
    return selector(_testStore.getState());
  };
  // Attach getState / setState so components can call useAppStore.getState()
  // (BookmarkButton doesn't do this, but the mock is more robust with it)
  useAppStore.getState = () => {
    if (!_testStore) throw new Error('No test store mounted');
    return _testStore.getState();
  };
  useAppStore.setState = (partial: any) => {
    if (!_testStore) throw new Error('No test store mounted');
    _testStore.setState(partial);
  };
  return { useAppStore };
});

// ─── Import component AFTER mocks are set up ─────────────────────────────────

import BookmarkButton from '@/components/ui/BookmarkButton';
import client from '@/api/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildBookmarksStore() {
  return createStore(createBookmarksSlice);
}

const TARGET_TYPES: SavedItem['target_type'][] = ['post', 'product', 'showroom', 'task'];
const arbTargetType = fc.constantFrom<SavedItem['target_type']>(...TARGET_TYPES);

const arbSavedIdsRecord = fc
  .dictionary(
    fc.string({ minLength: 1, maxLength: 40 }),
    fc.record({
      target_id: fc.string({ minLength: 1, maxLength: 40 }),
      target_type: arbTargetType,
    })
  )
  .map((raw) => {
    const normalised: Record<string, SavedItem> = {};
    for (const [key, val] of Object.entries(raw)) {
      normalised[key] = { ...val, target_id: key };
    }
    return normalised;
  });

// ─── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  _testStore = null;
});

// ─── Task 2.2 — Properties 10 & 11: aria attributes ──────────────────────────

describe('Property 10 & 11: BookmarkButton aria attributes', () => {
  // Feature: bookmark-and-business-separator, Property 10: BookmarkButton aria-pressed mirrors saved state
  // Feature: bookmark-and-business-separator, Property 11: BookmarkButton aria-label reflects direction of action

  it('aria-pressed mirrors saved state and aria-label reflects direction of action', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          targetId: fc.string({ minLength: 1 }),
          saved: fc.boolean(),
        }),
        async ({ targetId, saved }) => {
          // Build a fresh isolated store and seed it to match `saved`
          const store = buildBookmarksStore();

          if (saved) {
            // Pre-seed the store so isSaved(targetId) returns true
            store.setState({
              savedIds: {
                [targetId]: {
                  target_id: targetId,
                  target_type: 'post',
                },
              },
            });
          } else {
            // Ensure the targetId is NOT in savedIds
            const { [targetId]: _removed, ...rest } = store.getState().savedIds;
            store.setState({ savedIds: rest });
          }

          // Point the mock at this store
          _testStore = store;

          const { unmount, container } = render(
            <BookmarkButton targetId={targetId} targetType="post" />
          );

          const button = within(container).getByRole('button');

          // Property 10: aria-pressed must equal the saved boolean (as string in DOM)
          expect(button).toHaveAttribute('aria-pressed', String(saved));

          // Property 11: aria-label must describe the correct direction
          const label = button.getAttribute('aria-label') ?? '';
          if (saved) {
            expect(label.toLowerCase()).toContain('remove');
          } else {
            expect(label.toLowerCase()).toContain('bookmark this');
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Task 2.3 — Properties 7 & 8: optimistic update + rollback ───────────────

describe('Property 7: Optimistic update is immediate', () => {
  // Feature: bookmark-and-business-separator, Property 7: Optimistic update is immediate

  it('isSaved flips synchronously before the API call resolves', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          targetId: fc.string({ minLength: 1 }),
          saved: fc.boolean(),
        }),
        arbTargetType,
        async ({ targetId, saved }, targetType) => {
          const store = buildBookmarksStore();

          // Seed initial state
          if (saved) {
            store.setState({
              savedIds: {
                [targetId]: { target_id: targetId, target_type: targetType },
              },
            });
          } else {
            const { [targetId]: _removed, ...rest } = store.getState().savedIds;
            store.setState({ savedIds: rest });
          }

          // Record the pre-call isSaved value
          const before = store.getState().isSaved(targetId);

          // Mock API to never resolve — the promise hangs indefinitely
          vi.mocked(client.post).mockReturnValueOnce(new Promise(() => {}));

          // Call toggleSave but do NOT await — we check state immediately
          // We need to yield execution so the synchronous optimistic update runs,
          // but NOT so far that the async API call has resolved.
          const togglePromise = store.getState().toggleSave(targetId, targetType);

          // The optimistic update happens synchronously inside toggleSave before
          // the awaited API call. A microtask tick is sufficient to let the
          // synchronous portion of toggleSave execute.
          await Promise.resolve();

          // Property 7: isSaved must have flipped
          const afterOptimistic = store.getState().isSaved(targetId);
          expect(afterOptimistic).toBe(!before);

          // Clean up — allow the promise to be GC'd
          void togglePromise;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 8: Rollback on API failure', () => {
  // Feature: bookmark-and-business-separator, Property 8: Rollback on API failure

  it('savedIds reverts to pre-call snapshot and error is non-null after API rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSavedIdsRecord,
        fc.string({ minLength: 1 }),
        arbTargetType,
        async (savedIds, targetId, targetType) => {
          const store = buildBookmarksStore();
          store.setState({ savedIds, error: null });

          // Capture snapshot before the call
          const snapshot = { ...store.getState().savedIds };

          // Mock API to reject
          vi.mocked(client.post).mockRejectedValueOnce(new Error('Network failure'));

          // Await the full toggle (including rollback)
          await store.getState().toggleSave(targetId, targetType);

          const afterSavedIds = store.getState().savedIds;
          const afterError = store.getState().error;

          // savedIds keys must match the snapshot exactly
          expect(Object.keys(afterSavedIds).sort()).toEqual(
            Object.keys(snapshot).sort()
          );
          for (const key of Object.keys(snapshot)) {
            expect(afterSavedIds[key]).toBeDefined();
          }

          // error must be a non-null string
          expect(afterError).not.toBeNull();
          expect(typeof afterError).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });
});
