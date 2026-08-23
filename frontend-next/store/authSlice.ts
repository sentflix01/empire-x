import { StateCreator } from 'zustand';
import client, { clearToken, ensureFreshToken } from '@/api/client';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_verified: boolean;
  created_at: string;
}

export interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  logout: (redirectTo?: string) => void;
  setUser: (user: User) => void;
}

// Deduplication: if a checkAuth is already in-flight, return the same promise
let _checkAuthPromise: Promise<void> | null = null;

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  checkAuth: async () => {
    if (typeof window === 'undefined') return;
    // TD-014: tokens live in memory only — re-hydrate via the refresh cookie.
    const hydrated = await ensureFreshToken();
    if (!hydrated) {
      set({ isAuthenticated: false, isLoading: false, user: null });
      return;
    }

    // Coalesce concurrent calls — only one network request at a time
    if (_checkAuthPromise) return _checkAuthPromise;

    _checkAuthPromise = (async () => {
      set({ isLoading: true, error: null });
      try {
        const { data } = await client.get('/api/auth/me');
        set({ user: data, isAuthenticated: true, isLoading: false, error: null });
      } catch (err: any) {
        clearToken();
        set({ user: null, isAuthenticated: false, isLoading: false, error: err?.error || 'Session expired' });
      } finally {
        _checkAuthPromise = null;
      }
    })();

    return _checkAuthPromise;
  },

  logout: (redirectTo?: string) => {
    client.post('/api/auth/logout').catch(() => {});
    clearToken();
    set({ user: null, isAuthenticated: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = typeof redirectTo === 'string' ? redirectTo : '/login';
    }
  },

  setUser: (user: User) => set({ user, isAuthenticated: true }),
});
