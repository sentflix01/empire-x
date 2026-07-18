import { StateCreator } from 'zustand';
import client from '@/api/client';

export interface CartItem {
  id: string;
  product_id: string;
  title?: string;
  price?: number;
  quantity: number;
  images?: string;
  [key: string]: any;
}

export interface CartSlice {
  items: CartItem[];
  total: number;
  count: number;
  isLoading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQty: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

function computeTotals(items: CartItem[]) {
  const count = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const total = items.reduce((s, i) => s + ((i.price || 0) * (i.quantity || 1)), 0);
  return { count, total };
}

export const createCartSlice: StateCreator<CartSlice, [], [], CartSlice> = (set, get) => ({
  items: [],
  total: 0,
  count: 0,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await client.get('/api/cart');
      const items = Array.isArray(data?.items) ? data.items : [];
      set({ items, ...computeTotals(items), isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.error || err?.message || 'Failed to load cart' });
    }
  },

  addItem: async (productId, quantity = 1) => {
    const prev = get().items;
    set({ isLoading: true });
    try {
      await client.post('/api/cart/add', { product_id: productId, quantity });
      const { data } = await client.get('/api/cart');
      const items = Array.isArray(data?.items) ? data.items : [];
      set({ items, ...computeTotals(items), isLoading: false });
    } catch (err: any) {
      // Rollback to previous state
      set({ items: prev, ...computeTotals(prev), isLoading: false, error: err?.error || 'Failed to add item' });
      throw err;
    }
  },

  removeItem: async (cartItemId) => {
    const prev = get().items;
    // Optimistic remove
    const optimistic = prev.filter((i) => i.id !== cartItemId);
    set({ items: optimistic, ...computeTotals(optimistic) });
    try {
      await client.delete(`/api/cart/${cartItemId}`);
    } catch (err: any) {
      // Rollback
      set({ items: prev, ...computeTotals(prev), error: err?.error || 'Failed to remove item' });
      throw err;
    }
  },

  updateQty: async (cartItemId, quantity) => {
    const prev = get().items;
    // Optimistic update
    const optimistic = prev.map((i) => i.id === cartItemId ? { ...i, quantity } : i);
    set({ items: optimistic, ...computeTotals(optimistic) });
    try {
      await client.put(`/api/cart/${cartItemId}`, { quantity });
    } catch (err: any) {
      // Rollback
      set({ items: prev, ...computeTotals(prev), error: err?.error || 'Failed to update quantity' });
      throw err;
    }
  },

  clearCart: async () => {
    const prev = get().items;
    set({ items: [], total: 0, count: 0 });
    try {
      await client.delete('/api/cart');
    } catch (err: any) {
      // Rollback
      set({ items: prev, ...computeTotals(prev), error: err?.error || 'Failed to clear cart' });
      throw err;
    }
  },
});
