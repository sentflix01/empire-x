import { beforeEach, describe, expect, it, vi } from 'vitest';
import { entities } from '@/api/entities';

const api = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/api/client', () => ({ default: api }));

describe('entity cursor pagination', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('unwraps product pages and passes the next cursor on subsequent requests', async () => {
    const cursor = '-created_at|2026-10-15T10:20:30.000Z|f8b4a3d2-0b1a-4c3d-8e9f-123456789abc';
    api.get
      .mockResolvedValueOnce({
        data: {
          products: [{ id: 'product-1', title: 'First item' }],
          next_cursor: cursor,
        },
      })
      .mockResolvedValueOnce({
        data: {
          products: [{ id: 'product-2', title: 'Second item' }],
          next_cursor: null,
        },
      });

    const firstPage = await entities.Product.filterPage(
      { seller_id: 'seller-1', status: 'active' },
      '-created_at',
      2,
    );
    const secondPage = await entities.Product.filterPage(
      { seller_id: 'seller-1', status: 'active' },
      '-created_at',
      2,
      firstPage.nextCursor ?? undefined,
    );

    expect(firstPage).toEqual({
      items: [{ id: 'product-1', title: 'First item' }],
      nextCursor: cursor,
    });
    expect(secondPage).toEqual({
      items: [{ id: 'product-2', title: 'Second item' }],
      nextCursor: null,
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/products', {
      params: { seller_id: 'seller-1', status: 'active', sort: '-created_at', limit: 2, cursor },
    });
  });
});
