/**
 * Product detail review regression tests.
 * These checks verify the previously missing review fetch, display, empty state,
 * and review submission behavior.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import * as fc from 'fast-check';

// ─── Mock next/navigation ─────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: '42' })),
  useRouter: vi.fn(() => ({ back: vi.fn(), push: vi.fn() })),
}));

// ─── Mock next/link ───────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ─── Mock @/api/client ────────────────────────────────────────────────────────
vi.mock('@/api/client', () => {
  const client = {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  };
  return { default: client, storeToken: vi.fn(), clearToken: vi.fn() };
});

// ─── Mock @/api/auth ──────────────────────────────────────────────────────────
vi.mock('@/api/auth', () => ({
  auth: {
    me: vi.fn(),
  },
}));

// ─── Mock @/api/entities ─────────────────────────────────────────────────────
vi.mock('@/api/entities', () => ({
  entities: {
    Product: {
      get: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      filter: vi.fn().mockResolvedValue([]),
    },
    UserProfile: {
      filter: vi.fn().mockResolvedValue([]),
    },
  },
}));

// ─── Mock @/lib/CartContext ───────────────────────────────────────────────────
vi.mock('@/lib/CartContext', () => ({
  useCart: vi.fn(() => ({ addToCart: vi.fn(), cart: { items: [] } })),
}));

// ─── Mock @/lib/AuthContext ───────────────────────────────────────────────────
vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u99' }, authChecked: true, isAuthenticated: true, isLoadingAuth: false })),
}));

// ─── Mock react-i18next ───────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// ─── Mock sonner ─────────────────────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Mock @/components/ui/ShareButton ────────────────────────────────────────
vi.mock('@/components/ui/ShareButton', () => ({
  default: () => <button aria-label="share">Share</button>,
}));

// ─── Mock lucide-react ────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <svg data-testid="icon-arrow-left" />,
  Heart: () => <svg data-testid="icon-heart" />,
  Share2: () => <svg data-testid="icon-share2" />,
  ShoppingCart: () => <svg data-testid="icon-shopping-cart" />,
  MapPin: () => <svg data-testid="icon-map-pin" />,
  Star: () => <svg data-testid="icon-star" />,
  Truck: () => <svg data-testid="icon-truck" />,
  Shield: () => <svg data-testid="icon-shield" />,
  MessageCircle: () => <svg data-testid="icon-message-circle" />,
  Bell: () => <svg data-testid="icon-bell" />,
  BellOff: () => <svg data-testid="icon-bell-off" />,
  Check: () => <svg data-testid="icon-check" />,
  Zap: () => <svg data-testid="icon-zap" />,
}));

// ─── Import modules after mocking ────────────────────────────────────────────
import client from '@/api/client';
import { auth } from '@/api/auth';
import ProductDetail from '@/views/ProductDetail';

// ─── Seed product fixture ─────────────────────────────────────────────────────
const PRODUCT_42 = {
  id: '42',
  title: 'Test Product',
  description: 'A great product for testing',
  price: 1000,
  currency: 'ETB',
  category: 'Electronics',
  condition: 'new',
  stock: 5,
  images: JSON.stringify(['https://example.com/img1.jpg']),
  seller_id: 'seller1',
  view_count: 10,
  average_rating: 4.0,
};

// ─── Seed review fixture ──────────────────────────────────────────────────────
const REVIEW_ALICE = {
  id: 1,
  product_id: '42',
  reviewer_id: 'u1',
  display_name: 'Alice',
  rating: 4,
  comment: 'Great product!',
  created_at: new Date().toISOString(),
  avatar_url: null,
};

// ─── Helper: set up default mocks ────────────────────────────────────────────
function setupDefaultMocks(reviewsPayload: any[] = [REVIEW_ALICE]) {
  const mockGet = client.get as ReturnType<typeof vi.fn>;
  mockGet.mockImplementation((url: string) => {
    if (url.match(/\/api\/reviews\/product\//)) {
      return Promise.resolve({ data: reviewsPayload });
    }
    if (url.match(/\/api\/products\//)) {
      return Promise.resolve({ data: PRODUCT_42 });
    }
    if (url.match(/\/api\/wishlists\/check\//)) {
      return Promise.resolve({ data: { wishlisted: false } });
    }
    if (url.match(/\/api\/wishlists\/price-alerts/)) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: {} });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration: Reviews Section Absent Before Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1 — Authenticated user, reviews populated
   *
   * The unfixed ProductDetail never calls client.get for /api/reviews/product/
   * and never renders review content. This test SHOULD FAIL on unfixed code,
   * confirming the bug: "Alice" not in DOM, client.get call count for reviews = 0.
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('renders reviewer name "Alice" and calls reviews API (expected to FAIL on unfixed code)', async () => {
    setupDefaultMocks([REVIEW_ALICE]);

    // Mock auth.me to return logged-in user who has NOT reviewed
    (auth.me as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u99' });

    await act(async () => {
      render(<ProductDetail />);
    });

    // Assert: client.get was called with a reviews URL
    await waitFor(() => {
      const reviewsCalls = (client.get as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([url]: [string]) => url && url.includes('/api/reviews/product/')
      );
      expect(reviewsCalls.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Assert: reviewer name "Alice" appears in DOM
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Assert: star rating element (interactive form) is present — aria-label "Rate X stars"
    await waitFor(() => {
      const starButtons = screen.queryAllByRole('button', { name: /Rate \d+ star/i });
      expect(starButtons.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  /**
   * Test 2 — Unauthenticated user
   *
   * On unfixed code, no "Sign in to leave a review" prompt is rendered.
   * This test SHOULD FAIL on unfixed code.
   *
   * Validates: Requirements 1.3
   */
  it('shows "Sign in to leave a review" for unauthenticated user (expected to FAIL on unfixed code)', async () => {
    setupDefaultMocks([REVIEW_ALICE]);

    // Override useAuth for this test — simulate unauthenticated state
    // ProductDetail passes currentUser={null} to ReviewsSection when user is null
    const authCtx = await import('@/lib/AuthContext');
    vi.mocked(authCtx.useAuth).mockReturnValue({
      user: null, authChecked: true, isAuthenticated: false, isLoadingAuth: false,
      logout: vi.fn(), navigateToLogin: vi.fn(), checkUserAuth: vi.fn(), refreshUser: vi.fn(),
      authError: null, appPublicSettings: null, isLoadingPublicSettings: false,
    } as any);

    // Mock auth.me to throw (unauthenticated)
    (auth.me as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not authenticated'));

    await act(async () => {
      render(<ProductDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Sign in to leave a review/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Restore default useAuth mock for subsequent tests
    vi.mocked(authCtx.useAuth).mockReturnValue({
      user: { id: 'u99' }, authChecked: true, isAuthenticated: true, isLoadingAuth: false,
    } as any);
  });

  /**
   * Test 3 — Empty reviews state
   *
   * Validates: Requirements 1.4
   */
  it('shows "No reviews yet" empty state when reviews array is empty', async () => {
    setupDefaultMocks([]); // empty array

    (auth.me as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u99' });

    await act(async () => {
      render(<ProductDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No reviews yet/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  /**
   * Property-based Test — Scoped PBT
   *
   * For each product ID in ["42", "99", "7"], and for randomly generated review arrays,
   * assert that after mounting ProductDetail the reviews API is called and review content appears.
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('PBT: for varied product IDs and review payloads, reviews API is called and content renders', async () => {
    const { useParams } = await import('next/navigation');

    const reviewArb = fc.record({
      id: fc.integer({ min: 1, max: 9999 }),
      product_id: fc.constantFrom('42', '99', '7'),
      reviewer_id: fc.string({ minLength: 1, maxLength: 10 }),
      display_name: fc.string({ minLength: 1, maxLength: 20 }),
      rating: fc.integer({ min: 1, max: 5 }),
      comment: fc.string({ minLength: 1, maxLength: 100 }),
      created_at: fc.constant(new Date().toISOString()),
      avatar_url: fc.constant(null),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('42', '99', '7'),
        fc.array(reviewArb, { minLength: 1, maxLength: 5 }),
        async (productId, reviews) => {
          vi.clearAllMocks();

          // Override useParams for this iteration
          (useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: productId });

          const mockGet = client.get as ReturnType<typeof vi.fn>;
          mockGet.mockImplementation((url: string) => {
            if (url.includes('/api/reviews/product/')) {
              return Promise.resolve({ data: reviews });
            }
            if (url.includes('/api/products/')) {
              return Promise.resolve({ data: { ...PRODUCT_42, id: productId } });
            }
            if (url.includes('/api/wishlists/check/')) {
              return Promise.resolve({ data: { wishlisted: false } });
            }
            if (url.includes('/api/wishlists/price-alerts')) {
              return Promise.resolve({ data: [] });
            }
            return Promise.resolve({ data: {} });
          });

          (auth.me as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u99' });

          const { unmount } = render(<ProductDetail />);

          try {
            // Assert API was called
            await waitFor(() => {
              const calls = (client.get as ReturnType<typeof vi.fn>).mock.calls.filter(
                ([url]: [string]) => url && url.includes('/api/reviews/product/')
              );
              expect(calls.length).toBeGreaterThan(0);
            }, { timeout: 3000 });

            // Assert first review display_name appears
            const firstName = reviews[0].display_name;
            await waitFor(() => {
              expect(screen.getAllByText(firstName).length).toBeGreaterThan(0);
            }, { timeout: 3000 });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 15000);
});
