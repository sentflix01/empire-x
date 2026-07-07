'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import client, { storeToken, clearToken } from '@/api/client';

interface AuthContextValue {
  user: Record<string, unknown> | null;
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
  const [user, setUser]                   = useState<Record<string, unknown> | null>(null);
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
    try {
      setIsLoadingAuth(true);
      const res = await client.get('/api/auth/me');
      setUser(res.data);
      setIsAuth(true);
      setAuthError(null);
      // Keep cookie in sync with localStorage token
      storeToken(token);
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
    clearToken();
    setUser(null);
    setIsAuth(false);
    setAuthChecked(false);
    const target = typeof redirectTo === 'string' ? redirectTo : '/login';
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

