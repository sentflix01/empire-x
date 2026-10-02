/**
 * Preservation Property Tests — Task 2
 *
 * Property 2: Preservation — Existing ProductDetail Interactions Unchanged
 *
 * These tests are written on the UNFIXED/current code. They are EXPECTED TO PASS,
 * establishing a baseline of existing behaviour that must not regress after the fix.
 *
 * Covers:
 *   - PBT: random product shapes render without error, retaining title/price
 *   - Cart button click → addToCart called with correct product.id
 *   - Heart button click (wishlist off) → client.post called with /api/wishlists
 *   - Heart button click (wishlist on) → client.delete called with /api/wishlists/:id
 *   - Thumbnail click at index 1 → main image updates to images[1]
 *   - Seller link renders with correct href
 *   - Product metadata fields render correct text content
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
vi.mock('@/api/entities', () => {
  const entitiesMock = {
    Product: {
      get: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      filter: vi.fn().mockResolvedValue([]),
    },
    UserProfile: {
      filter: vi.fn().mockResolvedValue([]),
    },
  };
  return {
    entities: entitiesMock,
    // ProductDetail uses `import('@/api/entities').then(m => m.default.entities...)`
    // but actually uses `const { default: entities_m } = await import("@/api/entities")`
    // so we expose it as default too
    default: { entities: entitiesMock },
  };
});

// ─── Mock @/lib/CartContext ───────────────────────────────────────────────────
const mockAddToCart = vi.fn();
vi.mock('@/lib/CartContext', () => ({
  useCart: vi.fn(() => ({ addToCart: mockAddToCart, addItem: mockAddToCart, cart: { items: [] } })),
}));

// ─── Mock @/lib/AuthContext ───────────────────────────────────────────────────
vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(() => ({ authChecked: true, isAuthenticated: false })),
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

// ─── Mock @/components/product/ReviewsSection ────────────────────────────────
// Stub out ReviewsSection so preservation tests focus purely on ProductDetail's
// own DOM and interactions — reviews functionality is tested separately.
vi.mock('@/components/product/ReviewsSection', () => ({
  default: ({ productId }: { productId: string | number }) => (
    <div data-testid="reviews-section-stub" data-product-id={String(productId)} />
  ),
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
import { entities } from '@/api/entities';
import ProductDetail from '@/views/ProductDetail';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const IMAGES = [
  'https://example.com/img0.jpg',
  'https://example.com/img1.jpg',
  'https://example.com/img2.jpg',
];

const BASE_PRODUCT = {
  id: '42',
  title: 'Test Product',
  description: 'A great product for testing',
  price: 1000,
  currency: 'ETB',
  category: 'Electronics',
  condition: 'new',
  stock: 5,
  images: JSON.stringify(IMAGES),
  seller_id: 'seller1',
  view_count: 10,
  average_rating: 4.0,
  location: 'Addis Ababa',
};

const SELLER_PROFILE = {
  id: 'sp1',
  user_id: 'seller1',
  display_name: 'Test Seller',
  headline: 'Best seller on the platform',
};

// ─── Helper: set up API mocks ─────────────────────────────────────────────────
function setupMocks(
  product: Record<string, any> = BASE_PRODUCT,
  options: { wishlisted?: boolean; user?: Record<string, any> | null } = {}
) {
  const { wishlisted = false, user = { id: 'u99' } } = options;

  const mockGet = client.get as ReturnType<typeof vi.fn>;
  mockGet.mockImplementation((url: string) => {
    if (url.match(/\/api\/products\//)) {
      return Promise.resolve({ data: product });
    }
    if (url.match(/\/api\/wishlists\/check\//)) {
      return Promise.resolve({ data: { wishlisted } });
    }
    if (url.match(/\/api\/wishlists\/price-alerts/)) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: {} });
  });

  if (user === null) {
    (auth.me as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not authenticated'));
  } else {
    (auth.me as ReturnType<typeof vi.fn>).mockResolvedValue(user);
  }

  // Make UserProfile.filter return the seller profile
  (entities.UserProfile.filter as ReturnType<typeof vi.fn>).mockResolvedValue([SELLER_PROFILE]);
}

// ─── Helper: render and wait for product to load ──────────────────────────────
async function renderAndWait() {
  let container: HTMLElement;
  await act(async () => {
    const result = render(<ProductDetail />);
    container = result.container;
  });
  // Wait for the product title to appear, which means loading is complete
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  }, { timeout: 3000 });
  return container!;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Preservation: Existing ProductDetail Interactions Unchanged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToCart.mockClear();
    // Re-configure entities filter after clearAllMocks resets it
    (entities.UserProfile.filter as ReturnType<typeof vi.fn>).mockResolvedValue([SELLER_PROFILE]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── PBT: Random product shapes render without error ────────────────────────

  /**
   * Property-based test: for randomly generated product shapes with varying
   * image counts (0–5), stock values (0/null/positive), optional description,
   * and optional location — the card renders without throwing and retains
   * the product title and price in the DOM.
   *
   * Validates: Requirements 3.1, 3.5
   */
  it('PBT: random product shapes render without error and retain title/price', async () => {
    const { useParams } = await import('next/navigation');
    (useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: '42' });

    const imageArb = fc.webUrl();
    const stockArb = fc.oneof(
      fc.constant(null),
      fc.constant(0),
      fc.integer({ min: 1, max: 999 }),
    );
    const productArb = fc.record({
      id: fc.constant('42'),
      title: fc.string({ minLength: 1, maxLength: 50 }),
      price: fc.integer({ min: 1, max: 99999 }),
      currency: fc.constantFrom('ETB', 'USD', 'EUR'),
      category: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      condition: fc.option(fc.constantFrom('new', 'used'), { nil: undefined }),
      description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
      location: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      stock: stockArb,
      images: fc.array(imageArb, { minLength: 0, maxLength: 5 }).map(imgs => JSON.stringify(imgs)),
      seller_id: fc.constant('seller1'),
      view_count: fc.integer({ min: 0, max: 9999 }),
      average_rating: fc.float({ min: 0, max: 5, noNaN: true }),
    });

    await fc.assert(
      fc.asyncProperty(productArb, async (product) => {
        vi.clearAllMocks();
        mockAddToCart.mockClear();
        setupMocks(product);

        const { unmount } = render(<ProductDetail />);
        try {
          // Product card renders without error
          await waitFor(() => {
            expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
          }, { timeout: 3000 });

          // Title is preserved in DOM
          expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(product.title);

          // Price is preserved in DOM (rendered as toLocaleString)
          const priceText = product.price.toLocaleString();
          expect(screen.getByText(priceText)).toBeInTheDocument();
        } finally {
          unmount();
        }
      }),
      { numRuns: 10 }
    );
  }, 30000);

  it('renders a product with null images without crashing', async () => {
    setupMocks({ ...BASE_PRODUCT, images: null });

    await renderAndWait();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(BASE_PRODUCT.title);
    expect(screen.queryByRole('img', { name: BASE_PRODUCT.title })).not.toBeInTheDocument();
  });

  // ─── Cart interaction ────────────────────────────────────────────────────────

  /**
   * Cart button click → addToCart mock called with correct product.id
   *
   * Validates: Requirements 3.2
   */
  it('cart button click calls addToCart with the correct product.id', async () => {
    setupMocks();
    await renderAndWait();

    const cartButton = screen.getByRole('button', { name: /Add to Cart/i });
    await userEvent.click(cartButton);

    expect(mockAddToCart).toHaveBeenCalledTimes(1);
    expect(mockAddToCart).toHaveBeenCalledWith(BASE_PRODUCT.id);
  });

  // ─── Wishlist interactions ────────────────────────────────────────────────────

  /**
   * Heart button click when wishlist is OFF → client.post called with /api/wishlists
   *
   * Validates: Requirements 3.3
   */
  it('heart button click (wishlist off) calls client.post with /api/wishlists', async () => {
    setupMocks(BASE_PRODUCT, { wishlisted: false });
    await renderAndWait();

    const heartIcon = screen.getByTestId('icon-heart');
    const wishlistBtn = heartIcon.closest('button') as HTMLElement;
    expect(wishlistBtn).toBeTruthy();

    await userEvent.click(wishlistBtn);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/wishlists', { product_id: BASE_PRODUCT.id });
    }, { timeout: 3000 });
  });

  /**
   * Heart button click when wishlist is ON → client.delete called with /api/wishlists/:id
   *
   * Validates: Requirements 3.3
   */
  it('heart button click (wishlist on) calls client.delete with /api/wishlists/:id', async () => {
    setupMocks(BASE_PRODUCT, { wishlisted: true });
    await renderAndWait();

    const heartIcon = screen.getByTestId('icon-heart');
    const wishlistBtn = heartIcon.closest('button') as HTMLElement;
    expect(wishlistBtn).toBeTruthy();

    await userEvent.click(wishlistBtn);

    await waitFor(() => {
      expect(client.delete).toHaveBeenCalledWith(`/api/wishlists/${BASE_PRODUCT.id}`);
    }, { timeout: 3000 });
  });

  // ─── Thumbnail / image gallery ───────────────────────────────────────────────

  /**
   * Thumbnail click at index 1 → main image updates to images[1]
   *
   * Validates: Requirements 3.4
   */
  it('thumbnail click at index 1 updates the main image src to images[1]', async () => {
    setupMocks();
    await renderAndWait();

    // Verify initial main image is images[0]
    const mainImg = screen.getAllByRole('img').find(
      img => (img as HTMLImageElement).alt === BASE_PRODUCT.title
    ) as HTMLImageElement;
    expect(mainImg).toBeTruthy();
    expect(mainImg.src).toBe(IMAGES[0]);

    // Find thumbnail buttons in the thumbnail strip
    // Thumbnails are buttons wrapping images with alt="* thumbnail"
    const thumbButtons = screen
      .getAllByRole('button')
      .filter(btn => btn.querySelector('img[alt$=" thumbnail"]'));
    expect(thumbButtons.length).toBeGreaterThanOrEqual(2);

    // Click thumbnail at index 1
    await userEvent.click(thumbButtons[1]);

    await waitFor(() => {
      const updatedImg = screen.getAllByRole('img').find(
        img => (img as HTMLImageElement).alt === BASE_PRODUCT.title
      ) as HTMLImageElement;
      expect(updatedImg.src).toBe(IMAGES[1]);
    }, { timeout: 3000 });
  });

  // ─── Seller link ─────────────────────────────────────────────────────────────

  /**
   * Seller link renders with correct href pointing to /profile/:seller_id
   *
   * Validates: Requirements 3.5
   */
  it('seller link renders with correct href to seller profile', async () => {
    setupMocks();
    await renderAndWait();

    await waitFor(() => {
      const sellerLink = screen.getByRole('link', { name: /Test Seller/i });
      expect(sellerLink).toBeInTheDocument();
      expect(sellerLink).toHaveAttribute('href', `/profile/${BASE_PRODUCT.seller_id}`);
    }, { timeout: 3000 });
  });

  // ─── Product metadata ────────────────────────────────────────────────────────

  /**
   * Product title, price, description, category badge, stock label, and
   * location all render with their data values.
   *
   * Validates: Requirements 3.1, 3.5
   */
  it('product metadata fields render correct text content', async () => {
    setupMocks();
    await renderAndWait();

    // Title
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(BASE_PRODUCT.title);

    // Price (as toLocaleString)
    expect(screen.getByText(BASE_PRODUCT.price.toLocaleString())).toBeInTheDocument();

    // Currency
    expect(screen.getByText(BASE_PRODUCT.currency)).toBeInTheDocument();

    // Description
    expect(screen.getByText(BASE_PRODUCT.description)).toBeInTheDocument();

    // Category badge
    expect(screen.getByText(BASE_PRODUCT.category)).toBeInTheDocument();

    // Condition badge
    expect(screen.getByText(BASE_PRODUCT.condition)).toBeInTheDocument();

    // Stock label — "5 in stock"
    expect(screen.getByText(`${BASE_PRODUCT.stock} in stock`)).toBeInTheDocument();

    // Location
    expect(screen.getByText(BASE_PRODUCT.location)).toBeInTheDocument();
  });

  /**
   * Out-of-stock product renders stock label and disables cart button
   *
   * Validates: Requirements 3.1
   */
  it('out-of-stock product renders "Out of stock" label and disables cart button', async () => {
    const outOfStockProduct = { ...BASE_PRODUCT, stock: 0 };
    setupMocks(outOfStockProduct);
    await renderAndWait();

    expect(screen.getByText('Out of stock')).toBeInTheDocument();

    const cartButton = screen.getByRole('button', { name: /Add to Cart/i });
    expect(cartButton).toBeDisabled();
  });

  /**
   * Null stock product renders "In stock" (null stock = unlimited)
   *
   * Validates: Requirements 3.1
   */
  it('null stock product renders "In stock"', async () => {
    const nullStockProduct = { ...BASE_PRODUCT, stock: null };
    setupMocks(nullStockProduct);
    await renderAndWait();

    expect(screen.getByText('In stock')).toBeInTheDocument();

    const cartButton = screen.getByRole('button', { name: /Add to Cart/i });
    expect(cartButton).not.toBeDisabled();
  });
});
