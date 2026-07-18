'use client';
/**
 * CartContext — delegates to the Zustand AppStore cart slice.
 *
 * Maintains the exact same useCart() public API so all existing
 * call sites require zero changes.
 *
 * Feature: professional-grade-upgrade
 * Requirements: 3.5
 */
import React, { createContext, useContext, useEffect, ReactNode, useMemo } from 'react';
import { useAppStore, type AppStore } from '@/store';
import { useAuth } from '@/lib/AuthContext';

type CartValue = {
  cart: { items: any[]; total: number; count: number };
  loading: boolean;
  addItem: (productId: any, quantity?: number) => Promise<void> | void;
  removeItem: (cartItemId: any) => Promise<void> | void;
  updateQty: (cartItemId: any, quantity: number) => Promise<void> | void;
  clearCart: () => Promise<void> | void;
  refetch: () => Promise<void> | void;
};

const CartContext = createContext<CartValue | null>(null);
const selectItems = (s: AppStore) => s.items;
const selectTotal = (s: AppStore) => s.total;
const selectCount = (s: AppStore) => s.count;
const selectLoading = (s: AppStore) => s.isLoading;
const selectAddItem = (s: AppStore) => s.addItem;
const selectRemoveItem = (s: AppStore) => s.removeItem;
const selectUpdateQty = (s: AppStore) => s.updateQty;
const selectClearCart = (s: AppStore) => s.clearCart;
const selectRefetch = (s: AppStore) => s.fetchCart;

function useCartValue(): CartValue {
  const items = useAppStore(selectItems);
  const total = useAppStore(selectTotal);
  const count = useAppStore(selectCount);
  const loading = useAppStore(selectLoading);
  const addItem = useAppStore(selectAddItem);
  const removeItem = useAppStore(selectRemoveItem);
  const updateQty = useAppStore(selectUpdateQty);
  const clearCart = useAppStore(selectClearCart);
  const refetch = useAppStore(selectRefetch);

  return useMemo(
    () => ({
      cart: { items, total, count },
      loading,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      refetch,
    }),
    [items, total, count, loading, addItem, removeItem, updateQty, clearCart, refetch],
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { authChecked, isAuthenticated } = useAuth();
  const fetchCart = useAppStore(s => s.fetchCart);

  // Fetch cart once auth resolves
  useEffect(() => {
    if (authChecked && isAuthenticated) {
      fetchCart();
    }
  }, [authChecked, isAuthenticated, fetchCart]);

  const value = useCartValue();

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
