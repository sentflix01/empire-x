'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import client, { storeToken, clearToken } from '@/api/client';

export interface AuthUser {
  id?: string;
  full_name?: string;
  email?: string;
  role?: string;
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
  checkUserAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]                   = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuth]      = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError]         = useState<{ type: string; message: string } | null>(null);
  const [authChecked, setAuthChecked]     = useState(false);

  const checkUserAuth = useCallback(async () => {
    if (typeof window === 'undefined') return; // SSR guard
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsAuth(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }
    // Fix #3: Hydrate _accessToken in memory BEFORE calling /me so the
    // axios request interceptor sends the Authorization header correctly.
    storeToken(token);
    try {
      setIsLoadingAuth(true);
      const res = await client.get('/api/auth/me');
      setUser(res.data as AuthUser);
      setIsAuth(true);
      setAuthError(null);
    } catch (error: any) {
      clearToken();
      setUser(null);
      setIsAuth(false);
      if (error?.status === 401 || error?.response?.status === 401) {
        setAuthError({ type: 'auth_required', message: 'Session expired. Please log in again.' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => { checkUserAuth(); }, [checkUserAuth]);

  const logout = (redirectTo?: string) => {
    // Revoke refresh token server-side before clearing local state
    client.post('/api/auth/logout').catch(() => {});
    clearToken();
    setUser(null);
    setIsAuth(false);
    setAuthChecked(false);
    const target = typeof redirectTo === 'string' ? redirectTo : '/';
    if (typeof window !== 'undefined') window.location.href = target;
  };

  const navigateToLogin = () => {
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

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

