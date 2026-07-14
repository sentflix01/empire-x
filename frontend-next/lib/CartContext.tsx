/**
 * CartContext — global shopping cart state.
 * Syncs with backend cart API and keeps a local copy in state.
 *
 * Usage:
 *   import { useCart } from '@/lib/CartContext';
 *   const { cart, addItem, removeItem, updateQty, clearCart } = useCart();
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '@/api/client';
import { useAuth } from '@/lib/AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const { authChecked, isAuthenticated } = useAuth();

  const fetchCart = useCallback(async () => {
    try {
      const { data } = await client.get('/api/cart');
      setCart(data);
    } catch {
      // Not logged in or cart empty — keep default
    }
  }, []);

  // Initial fetch only after auth resolves — avoids spurious 401 on login page
  useEffect(() => {
    if (authChecked && isAuthenticated) {
      fetchCart();
    }
  }, [authChecked, isAuthenticated, fetchCart]);

  const addItem = async (productId, quantity = 1) => {
    setLoading(true);
    try {
      await client.post('/api/cart/add', { product_id: productId, quantity });
      await fetchCart();
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (cartItemId) => {
    try {
      await client.delete(`/api/cart/${cartItemId}`);
      await fetchCart();
    } catch {}
  };

  const updateQty = async (cartItemId, quantity) => {
    try {
      await client.put(`/api/cart/${cartItemId}`, { quantity });
      await fetchCart();
    } catch {}
  };

  const clearCart = async () => {
    try {
      await client.delete('/api/cart');
      setCart({ items: [], total: 0, count: 0 });
    } catch {}
  };

  return (
    <CartContext.Provider value={{ cart, loading, addItem, removeItem, updateQty, clearCart, refetch: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

