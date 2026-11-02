/**
 * Preservation Property Tests — Task 2
 *
 * Property 2: Preservation — Optional data-page-guide Prop Does Not Break Other Sections
 *
 * These tests are written on UNFIXED code (before data-page-guide is added to
 * FriendsSectionProps). They are EXPECTED TO PASS, establishing a baseline that
 * must not regress once the fix is applied.
 *
 * Observation (unfixed code):
 *   - `FriendsSectionProps` does not yet include `data-page-guide`
 *   - Calling `<FriendsSection>` without the prop (My Friends, Mutual Friends) renders fine
 *   - Root <section> elements for those call sites carry no data-page-guide attribute
 *   - Loading, error, empty, card, and collapse/expand states all work correctly
 *
 * Covers:
 *   - Root <section> for My Friends and Mutual Friends has no data-page-guide attribute
 *   - Loading state renders skeletons
 *   - Empty state renders the expected message
 *   - Card state renders UserCards
 *   - Error state renders the error message
 *   - Collapse/expand behaviour is intact
 *   - PBT: for arbitrary friend lists (0–8 items), neither My Friends nor
 *     Mutual Friends section carries a data-page-guide attribute
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';

// ─── Mock next/navigation ─────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
    has: () => false,
  }),
  usePathname: () => '/friends',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// ─── Mock @/api/client ────────────────────────────────────────────────────────
vi.mock('@/api/client', () => {
  const client = {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  };
  return { default: client, storeToken: vi.fn(), clearToken: vi.fn() };
});

// ─── Mock @/api/friends ───────────────────────────────────────────────────────
vi.mock('@/api/friends', () => ({
  friendsApi: {
    getMutual: vi.fn().mockResolvedValue([]),
  },
}));

// ─── Mock @/api/suggestions ───────────────────────────────────────────────────
vi.mock('@/api/suggestions', () => ({
  suggestionsApi: {
    getPeople: vi.fn().mockResolvedValue([]),
    dismiss: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Mock @/lib/AuthContext ───────────────────────────────────────────────────
vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-1' },
    authChecked: true,
    isAuthenticated: true,
    isLoadingAuth: false,
    authError: null,
    appPublicSettings: null,
    isLoadingPublicSettings: false,
    logout: vi.fn(),
    navigateToLogin: vi.fn(),
    checkUserAuth: vi.fn(),
    refreshUser: vi.fn(),
    completeLogin: vi.fn(),
  })),
}));

// ─── Mock sonner ─────────────────────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Mock lucide-react ────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  Users: () => <svg data-testid="icon-users" />,
  UserCheck: () => <svg data-testid="icon-user-check" />,
  Sparkles: () => <svg data-testid="icon-sparkles" />,
}));

// ─── Mock @/components/friends/UserCard ──────────────────────────────────────
vi.mock('@/components/friends/UserCard', () => ({
  UserCard: ({ displayName, userId }: { displayName: string; userId: string }) => (
    <div data-testid="user-card" data-user-id={userId}>{displayName}</div>
  ),
}));

// ─── Mock @/components/ErrorBoundary ─────────────────────────────────────────
vi.mock('@/components/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Import API mocks so we can configure them per-test ──────────────────────
import client from '@/api/client';
import { friendsApi } from '@/api/friends';
import { suggestionsApi } from '@/api/suggestions';

// ─── Import component under test ─────────────────────────────────────────────
import FriendsPage from '@/views/Friends';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** A mutual friend shape as returned by the API. */
const mutualItemArb = fc.record({
  user_id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 40 }),
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  business_name: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: null }),
  mutual_count: fc.option(fc.integer({ min: 0, max: 99 }), { nil: undefined }),
});

/** Array of 0–8 mutual friend items. */
const mutualsListArb = fc.array(mutualItemArb, { minLength: 0, maxLength: 8 });

// ─── Helper: configure API mocks for a render ─────────────────────────────────

interface SectionData {
  followedIds?: string[];
  mutuals?: Array<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    business_name?: string | null;
    mutual_count?: number;
  }>;
  /** Simulate an error from the mutuals endpoint */
  mutualError?: boolean;
}

function setupMocks({
  followedIds = [],
  mutuals = [],
  mutualError = false,
}: SectionData = {}) {
  const mockGet = client.get as ReturnType<typeof vi.fn>;

  // /api/profiles/me/follows → followedIds
  // /api/profiles/by-user/:id → minimal profile
  mockGet.mockImplementation((url: string) => {
    if (url === '/api/profiles/me/follows') {
      return Promise.resolve({ data: followedIds });
    }
    const byUserMatch = url.match(/^\/api\/profiles\/by-user\/(.+)$/);
    if (byUserMatch) {
      const uid = byUserMatch[1];
      return Promise.resolve({
        data: {
          user_id: uid,
          display_name: `User ${uid}`,
          avatar_url: null,
          business_name: null,
        },
      });
    }
    return Promise.resolve({ data: [] });
  });

  if (mutualError) {
    (friendsApi.getMutual as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network error')
    );
  } else {
    (friendsApi.getMutual as ReturnType<typeof vi.fn>).mockResolvedValue(mutuals);
  }

  // Suggestions always empty — focus on My Friends & Mutual Friends
  (suggestionsApi.getPeople as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

// ─── Helper: render page and wait for async effects to settle ─────────────────

/**
 * Renders the FriendsPage and waits until all three section <h2> headings are
 * present. The headings are rendered synchronously inside each FriendsSection —
 * they don't depend on loading state — so their presence confirms the component
 * tree is mounted and initial effects have been submitted.
 *
 * Individual tests then waitFor their specific assertions if needed.
 */
async function renderPage(opts: SectionData = {}): Promise<{ container: HTMLElement }> {
  setupMocks(opts);
  const result = render(<FriendsPage />);

  // Wait for the page <h1> which is rendered synchronously
  await waitFor(
    () => expect(screen.getByText('Friends')).toBeInTheDocument(),
    { timeout: 3000 }
  );

  return result;
}

// ─── Helper: find the root <section> element for a named section ──────────────

/**
 * Finds the root <section> element that wraps a given section title.
 * The section header `<h2>` text is used to locate it.
 */
function findSectionByTitle(container: HTMLElement, title: string): HTMLElement {
  // Find <h2> elements within the container
  const headings = Array.from(container.querySelectorAll('h2'));
  const heading = headings.find((h) => h.textContent?.trim() === title);
  if (!heading) throw new Error(`Could not find <h2> with text "${title}"`);
  const section = heading.closest('section');
  if (!section) throw new Error(`Could not find root <section> for "${title}"`);
  return section as HTMLElement;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Preservation: Optional data-page-guide Prop Does Not Break Other Sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. Baseline attribute check ────────────────────────────────────────────

  /**
   * My Friends and Mutual Friends sections must NOT carry a data-page-guide
   * attribute on their root <section> element when the prop is omitted.
   * On unfixed code the prop doesn't exist in the interface yet — it cannot
   * be passed. On fixed code, these call sites deliberately omit it.
   *
   * Validates: Requirements 3.1, 3.2
   */
  it('My Friends and Mutual Friends root <section> elements have no data-page-guide attribute', async () => {
    const { container } = await renderPage();

    const myFriendsSection = findSectionByTitle(container, 'My Friends');
    const mutualFriendsSection = findSectionByTitle(container, 'Mutual Friends');

    expect(myFriendsSection).not.toHaveAttribute('data-page-guide');
    expect(mutualFriendsSection).not.toHaveAttribute('data-page-guide');
  }, 10000);

  // ─── 2. Empty state ──────────────────────────────────────────────────────────

  /**
   * When followedIds is empty, My Friends shows its empty-state message.
   * When mutuals is empty, Mutual Friends shows its empty-state message.
   *
   * Validates: Requirements 3.1
   */
  it('empty sections render their empty-state messages without error', async () => {
    await renderPage({ followedIds: [], mutuals: [] });

    // Wait for loading to complete by polling for the empty-state text
    await waitFor(
      () => expect(screen.getByText('You are not following anyone yet.')).toBeInTheDocument(),
      { timeout: 5000 }
    );
    await waitFor(
      () => expect(screen.getByText('No mutual friends yet.')).toBeInTheDocument(),
      { timeout: 5000 }
    );
  }, 10000);

  // ─── 3. Card state ───────────────────────────────────────────────────────────

  /**
   * When mutuals contains items, Mutual Friends renders a UserCard for each.
   *
   * Validates: Requirements 3.1
   */
  it('Mutual Friends section renders UserCard for each mutual friend', async () => {
    const mutuals = [
      { user_id: 'u1', display_name: 'Alice', avatar_url: null },
      { user_id: 'u2', display_name: 'Bob', avatar_url: null },
    ];
    await renderPage({ mutuals });

    await waitFor(
      () => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  }, 10000);

  // ─── 4. Error state ──────────────────────────────────────────────────────────

  /**
   * When the mutuals endpoint fails, Mutual Friends renders an error message
   * without crashing the page.
   *
   * Validates: Requirements 3.1
   */
  it('Mutual Friends section shows error state when API fails, without crashing', async () => {
    await renderPage({ mutualError: true });

    await waitFor(
      () => expect(screen.getByText(/Could not load mutual friends/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );

    // Rest of page still renders
    expect(screen.getByText('Friends')).toBeInTheDocument();
  }, 10000);

  // ─── 5. Collapse / expand behaviour ─────────────────────────────────────────

  /**
   * When a section has more than 5 items, the "Show N more" button appears.
   * Clicking it expands the list; "Show less" collapses it again.
   * The root <section> must never acquire a data-page-guide attribute during
   * this expand/collapse cycle.
   *
   * Validates: Requirements 3.2
   */
  it('Mutual Friends section collapse/expand behaviour is intact with no data-page-guide', async () => {
    // 7 mutual friends — exceeds the collapse threshold of 5
    const mutuals = Array.from({ length: 7 }, (_, i) => ({
      user_id: `u${i}`,
      display_name: `Friend ${i}`,
      avatar_url: null,
    }));
    const { container } = await renderPage({ mutuals });

    // Wait for cards to render
    await waitFor(
      () => expect(screen.getByText('Friend 0')).toBeInTheDocument(),
      { timeout: 5000 }
    );

    const mutualSection = findSectionByTitle(container, 'Mutual Friends');

    // Initially collapsed — "Show 2 more" button visible
    const showMoreBtn = await waitFor(() => {
      const btn = screen
        .getAllByRole('button')
        .find((b) => b.textContent?.includes('Show') && b.textContent.includes('more'));
      expect(btn).toBeTruthy();
      return btn!;
    }, { timeout: 5000 });

    // No attribute before expand
    expect(mutualSection).not.toHaveAttribute('data-page-guide');

    // Expand
    await userEvent.click(showMoreBtn);

    // "Show less" appears; all 7 cards visible
    await waitFor(
      () => expect(screen.getByRole('button', { name: /Show less/i })).toBeInTheDocument(),
      { timeout: 5000 }
    );
    // Still no attribute after expand
    expect(mutualSection).not.toHaveAttribute('data-page-guide');

    // Collapse again
    await userEvent.click(screen.getByRole('button', { name: /Show less/i }));

    await waitFor(() => {
      const stillMoreBtn = screen
        .getAllByRole('button')
        .find((b) => b.textContent?.includes('Show') && b.textContent.includes('more'));
      expect(stillMoreBtn).toBeInTheDocument();
    }, { timeout: 5000 });

    // Attribute still absent after collapse
    expect(mutualSection).not.toHaveAttribute('data-page-guide');
  }, 15000);

  // ─── 6. PBT: arbitrary mutual lists, no data-page-guide attribute ────────────

  /**
   * PBT: For all renders of the Friends page with arbitrary mutual friend lists
   * (0–8 items), the root <section> elements for My Friends and Mutual Friends
   * must carry no data-page-guide attribute.
   *
   * These are the two sections that omit the prop. The property verifies that
   * omitting a prop the interface doesn't have (unfixed code) or omitting an
   * optional prop (fixed code) never causes the attribute to appear.
   *
   * Validates: Requirements 3.1, 3.2, 3.3
   */
  it('PBT: for all renders with omitted data-page-guide, root <section> has no data-page-guide attribute', async () => {
    await fc.assert(
      fc.asyncProperty(
        mutualsListArb,
        async (mutualFriends) => {
          vi.clearAllMocks();

          // Re-wire the module-level mocks after clearAllMocks
          (suggestionsApi.getPeople as ReturnType<typeof vi.fn>).mockResolvedValue([]);

          setupMocks({
            mutuals: mutualFriends.map(({ mutual_count, ...rest }) => ({
              ...rest,
              mutual_count: mutual_count ?? undefined,
            })),
          });

          const { container, unmount } = render(<FriendsPage />);

          try {
            // Wait for the page to render (h1 Friends is synchronous)
            await waitFor(
              () => expect(screen.getByText('Friends')).toBeInTheDocument(),
              { timeout: 3000 }
            );

            // Find section roots by h2 text
            const h2s = Array.from(container.querySelectorAll('h2'));
            const myFriendsH2 = h2s.find((h) => h.textContent?.trim() === 'My Friends');
            const mutualH2 = h2s.find((h) => h.textContent?.trim() === 'Mutual Friends');

            // Both section headings must be present
            if (!myFriendsH2 || !mutualH2) return false;

            const myFriendsSection = myFriendsH2.closest('section');
            const mutualSection = mutualH2.closest('section');

            // Property: neither section carries data-page-guide
            if (!myFriendsSection || myFriendsSection.hasAttribute('data-page-guide')) return false;
            if (!mutualSection || mutualSection.hasAttribute('data-page-guide')) return false;

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 8 }
    );
  }, 60000);
});
