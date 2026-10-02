import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarketplacePage from '@/views/Marketplace';

const api = vi.hoisted(() => ({ get: vi.fn() }));
let intersectionCallback: IntersectionObserverCallback | null = null;

vi.mock('@/api/client', () => ({ default: api }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key === 'marketplace.categories.all' ? 'All' : key }) }));
vi.mock('@/components/marketplace/ProductCard', () => ({
  default: ({ product }: { product: { title: string } }) => <div data-testid="marketplace-product">{product.title}</div>,
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

describe('Marketplace API contract', () => {
  beforeEach(() => {
    intersectionCallback = null;
    api.get.mockReset().mockResolvedValue({
      data: {
        products: [{ id: 'product-1', title: 'Visible product', status: 'active' }],
        next_cursor: null,
      },
    });
    global.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) { intersectionCallback = callback; }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = '';
      thresholds = [];
    } as unknown as typeof IntersectionObserver;
  });

  it('renders products from the paginated { products, next_cursor } response', async () => {
    render(<MarketplacePage />);

    expect(await screen.findByText('Visible product')).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/products', expect.objectContaining({
      params: expect.objectContaining({ status: 'active', sort: '-created_at', limit: 24 }),
    })));
  });

  it('requests subsequent pages using the server cursor instead of offset', async () => {
    api.get.mockReset()
      .mockResolvedValueOnce({ data: { products: [{ id: 'product-1', title: 'First item', status: 'active' }], next_cursor: '-created_at|2026-09-27T10:20:30.000Z|f8b4a3d2-0b1a-4c3d-8e9f-123456789abc' } })
      .mockResolvedValueOnce({ data: { products: [{ id: 'product-2', title: 'Second item', status: 'active' }], next_cursor: null } });
    render(<MarketplacePage />);
    expect(await screen.findByText('First item')).toBeInTheDocument();

    act(() => {
      intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry] as IntersectionObserverEntry[], {} as IntersectionObserver);
    });

    expect(await screen.findByText('Second item')).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/api/products', expect.objectContaining({
      params: expect.objectContaining({ cursor: expect.stringMatching(/^-created_at\|/) }),
    }));
  });
});
