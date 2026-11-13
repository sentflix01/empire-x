/**
 * Bug Condition Exploration: Friends Page renders visible code comment text node
 *
 * Property 1: Bug Condition — Comment Leak on Friends Page
 *
 * The defect is static and unconditional: any render of the Friends page includes
 * the literal string `// data-page-guide="friends-suggestions" on FriendsSection`
 * as a visible text node in the DOM. This text leaks from a malformed inline
 * comment placed after a JSX block comment closing brace.
 *
 * This test MUST FAIL on unfixed code (failure confirms the bug exists).
 * It PASSES after the fix is applied, confirming the text node has been removed.
 *
 * Validates: Requirements 1.1, 1.2
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// ─── Mock @/lib/api/client ────────────────────────────────────────────────────────
vi.mock('@/lib/api/client', () => {
  const client = {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  };
  return { default: client, storeToken: vi.fn(), clearToken: vi.fn() };
});

// ─── Mock @/lib/api/friends ───────────────────────────────────────────────────────
vi.mock('@/lib/api/friends', () => ({
  friendsApi: {
    getMutual: vi.fn().mockResolvedValue([]),
  },
}));

// ─── Mock @/lib/api/suggestions ───────────────────────────────────────────────────
vi.mock('@/lib/api/suggestions', () => ({
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
  UserCard: ({ displayName }: { displayName: string }) => (
    <div data-testid="user-card">{displayName}</div>
  ),
}));

// ─── Mock @/components/ErrorBoundary ─────────────────────────────────────────
vi.mock('@/components/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Import component under test ─────────────────────────────────────────────
import FriendsPage from '@/views/Friends';

// ─── Helper: collect all text node content from the container ─────────────────
function collectTextNodes(node: Node): string[] {
  const texts: string[] = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    const val = current.nodeValue ?? '';
    if (val.trim().length > 0) {
      texts.push(val);
    }
    current = walker.nextNode();
  }
  return texts;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration: Friends Page Comment Leak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Concrete failing case — deterministic bug condition.
   *
   * Renders the Friends page and walks the DOM for text nodes.
   * The assertion should FAIL on unfixed code because the string
   * `// data-page-guide="friends-suggestions" on FriendsSection`
   * is rendered as a literal text node after the JSX block comment.
   *
   * Counterexample: rendered text includes
   *   `// data-page-guide="friends-suggestions" on FriendsSection`
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('renders no text node containing "// data-page-guide" (EXPECTED TO FAIL on unfixed code)', () => {
    const { container } = render(<FriendsPage />);

    const textNodes = collectTextNodes(container);
    const leakingNode = textNodes.find((t) => t.includes('// data-page-guide'));

    // This assertion FAILS on unfixed code, confirming the bug.
    // Counterexample: leakingNode === '// data-page-guide="friends-suggestions" on FriendsSection'
    expect(leakingNode).toBeUndefined();
  });

  /**
   * Scoped property-based test — the bug is static, so the property
   * is scoped to the concrete render case rather than a random input sweep.
   *
   * For any render of the Friends page (represented as a unit render here),
   * no text node must contain the string `"// data-page-guide"`.
   *
   * Because the defect is unconditional, a single fc.constant(true) seed is
   * sufficient to exercise the full input space for this property.
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('PBT: for all renders of the Friends page, no text node contains "// data-page-guide" (EXPECTED TO FAIL on unfixed code)', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // deterministic bug — one render is the full input space
        (_seed) => {
          const { container, unmount } = render(<FriendsPage />);

          try {
            const textNodes = collectTextNodes(container);
            const hasLeak = textNodes.some((t) => t.includes('// data-page-guide'));

            // Property: rendered_text_nodes.none(t => t.includes("// data-page-guide"))
            return !hasLeak;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 1 }
    );
  });
});
