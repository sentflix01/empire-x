/**
 * Cart slice tests — optimistic update + rollback
 * Feature: professional-grade-upgrade
 * Requirements: 4.4, 4.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock client before importing store
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

// Mock auth module used by authSlice
vi.mock('@/api/auth', () => ({
  auth: {
    logout: vi.fn(),
    loginViaEmailPassword: vi.fn(),
  },
}));

import client from '@/api/client';
import { createCartSlice } from '@/store/cartSlice';
import { createStore } from 'zustand';

function buildCartStore() {
  return createStore(createCartSlice);
}

describe('CartSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchCart loads items from API', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: {
        items: [{ id: 'item-1', product_id: 'prod-1', quantity: 2, price: 100 }],
        total: 200,
        count: 2,
      },
    });

    const store = buildCartStore();
    await store.getState().fetchCart();

    expect(store.getState().items).toHaveLength(1);
    expect(store.getState().count).toBe(2);
    expect(store.getState().total).toBe(200);
  });

  it('removeItem optimistically removes and rolls back on failure', async () => {
    // Set up initial state with one item
    vi.mocked(client.get).mockResolvedValueOnce({
      data: { items: [{ id: 'item-1', product_id: 'p1', quantity: 1, price: 50 }] },
    });
    const store = buildCartStore();
    await store.getState().fetchCart();

    expect(store.getState().items).toHaveLength(1);

    // API call fails
    vi.mocked(client.delete).mockRejectedValueOnce(new Error('Network error'));

    await expect(store.getState().removeItem('item-1')).rejects.toThrow();

    // Items should be rolled back
    expect(store.getState().items).toHaveLength(1);
  });

  it('removeItem completes successfully and keeps item removed', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: { items: [{ id: 'item-2', product_id: 'p2', quantity: 1, price: 75 }] },
    });
    const store = buildCartStore();
    await store.getState().fetchCart();

    vi.mocked(client.delete).mockResolvedValueOnce({ data: {} });

    await store.getState().removeItem('item-2');

    expect(store.getState().items).toHaveLength(0);
  });

  it('updates quantities optimistically and rolls back on failure', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: { items: [{ id: 'item-3', product_id: 'p3', quantity: 1, price: 40 }] },
    });
    const store = buildCartStore();
    await store.getState().fetchCart();

    vi.mocked(client.put).mockRejectedValueOnce(new Error('Network error'));

    await expect(store.getState().updateQty('item-3', 3)).rejects.toThrow();

    expect(store.getState().items[0].quantity).toBe(1);
    expect(store.getState().count).toBe(1);
    expect(store.getState().total).toBe(40);
  });
});
