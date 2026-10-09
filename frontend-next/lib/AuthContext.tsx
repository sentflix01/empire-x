'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import client, { clearToken, ensureFreshToken, getAccessToken } from '@/api/client';

export interface AuthUser {
  id?: string;
  full_name?: string;
  email?: string;
  role?: string;
  is_demo?: boolean;
  /** Active data environment: 2 means an isolated, cookie-bound sandbox. */
  demo_track?: 1 | 2 | null;
  demo_session_active?: boolean;
  demo_expires_at?: string | null;
  demo_workspace_available?: boolean;
  /** Set after first-login mode selection. null = user has not yet chosen. */
  onboarding_mode?: 'demo' | 'real' | null;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: { type: string; message: string } | null;
  appPublicSettings: null;
  authChecked: boolean;
  logout: (redirectTo?: string) => void;
  navigateToLogin: () => void;
  completeLogin: () => Promise<AuthUser>;
  checkUserAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
const AUTH_LOADING_UI_TIMEOUT_MS = 8_000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]                   = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuth]      = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError]         = useState<{ type: string; message: string } | null>(null);
  const [authChecked, setAuthChecked]     = useState(false);

  const checkUserAuth = useCallback(async () => {
    if (typeof window === 'undefined') return; // SSR guard

    // Skip the refresh attempt on auth pages — there is never a session there
    // and the guaranteed 401 pollutes the console with misleading errors.
    const AUTH_PAGE_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify', '/auth/google/callback'];
    const onAuthPage = AUTH_PAGE_PREFIXES.some(p => window.location.pathname.startsWith(p));
    if (onAuthPage) {
      setUser(null);
      setIsAuth(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    // TD-014: the JWT never touches localStorage. A session can only be
    // re-hydrated through the silent refresh (HttpOnly refresh cookie).
    // ensureFreshToken() covers the "token already in memory" case too.

    // Do not churn the API for anonymous visitors on public pages — /api/auth/me
    // and /api/auth/refresh would both 401 and pollute the network console.
    // GetAccessToken() is only set after a successful login; the nb_auth cookie
    // is a non-sensitive hint set at login and cleared on logout/token expiry.
    const hasHintCookie = /(?:^|;) ?nb_auth=1(?:;|$)/.test(document.cookie);
    if (!getAccessToken() && !hasHintCookie) {
      setUser(null);
      setIsAuth(false);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    setIsLoadingAuth(true);

    try {
      const hasSession = await ensureFreshToken();
      if (!hasSession) {
        // No valid session (and silent refresh failed) — genuinely logged out.
        // Clear nb_auth hint cookie so middleware redirects cleanly.
        if (typeof document !== 'undefined') {
          document.cookie = 'nb_auth=; path=/; max-age=0';
        }
        setUser(null);
        setIsAuth(false);
        setAuthError(null);
        return;
      }

      // This await covers the full chain: original request + any silent refresh
      // + retry. The interceptor only rejects after refresh also fails.
      const res = await client.get('/api/auth/me');
      setUser(res.data as AuthUser);
      setIsAuth(true);
      setAuthError(null);
    } catch (error: any) {
      // Reaching here means both the original request AND the silent refresh
      // failed — the user genuinely has no valid session.
      const status = error?.status ?? error?.response?.status;
      if (status === 401) {
        clearToken();
        setUser(null);
        setIsAuth(false);
        setAuthError({ type: 'auth_required', message: 'Session expired. Please log in again.' });
      }
      // Non-401 (network error, 5xx): keep existing auth state — don't evict
      // the user just because the server had a momentary hiccup.
    } finally {
      // Only now is the full auth check truly complete.
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    // Public pages must remain usable while a slow refresh endpoint is waking
    // up. Keep the auth check running in the background so an existing session
    // can still be restored, but stop blocking the whole app shell after a
    // short grace period.
    const loadingTimer = window.setTimeout(
      () => setIsLoadingAuth(false),
      AUTH_LOADING_UI_TIMEOUT_MS,
    );
    void checkUserAuth().finally(() => window.clearTimeout(loadingTimer));
    return () => window.clearTimeout(loadingTimer);
  }, [checkUserAuth]);

  const logout = (redirectTo?: string) => {
    // Revoke the active environment's refresh cookie before navigation. Keep
    // local state cleared immediately so the old account cannot remain visible.
    clearToken();
    setUser(null);
    setIsAuth(false);
    setAuthChecked(false);
    const target = typeof redirectTo === 'string' ? redirectTo : '/';
    if (typeof window !== 'undefined') {
      // Delay navigation until logout reaches the server so the refresh cookie
      // is cleared before a new account environment can start.
      void client.post('/api/auth/logout', {}, { timeout: 5000 })
        .catch(() => {}).finally(() => { window.location.href = target; });
    }
  };

  const navigateToLogin = () => {
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

  // A successful login already placed the short-lived access token in memory.
  // Verify it here and update the root provider before navigating, so the app
  // shell never briefly treats a newly signed-in user as a guest.
  const completeLogin = useCallback(async (): Promise<AuthUser> => {
    setIsLoadingAuth(true);
    try {
      const res = await client.get('/api/auth/me');
      const authenticatedUser = res.data as AuthUser;
      setUser(authenticatedUser);
      setIsAuth(true);
      setAuthError(null);
      setAuthChecked(true);
      return authenticatedUser;
    } catch (error) {
      setUser(null);
      setIsAuth(false);
      setAuthChecked(true);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await checkUserAuth();
  }, [checkUserAuth]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      authChecked,
      logout,
      navigateToLogin,
      completeLogin,
      checkUserAuth,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
