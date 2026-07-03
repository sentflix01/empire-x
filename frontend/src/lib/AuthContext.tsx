import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import client from '@/api/client';

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
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }
    try {
      setIsLoadingAuth(true);
      const res = await client.get('/api/auth/me');
      setUser(res.data);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      localStorage.removeItem('access_token');
      setUser(null);
      setIsAuthenticated(false);
      if (error?.status === 401 || error?.response?.status === 401) {
        setAuthError({ type: 'auth_required', message: 'Session expired. Please log in again.' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const logout = (redirectTo?: string) => {
    localStorage.removeItem('access_token');
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(false);
    const target = typeof redirectTo === 'string' ? redirectTo : '/login';
    window.location.href = target;
  };

  const navigateToLogin = () => {
    // App.jsx handles redirect via <Navigate> — this is kept for compatibility
    // with any component that still calls it directly
    window.location.href = '/login';
  };

  // Called after a successful login/register to refresh user state
  const refreshUser = useCallback(async () => {
    await checkUserAuth();
  }, [checkUserAuth]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,  // kept for compatibility — always false now
      authError,
      appPublicSettings: null,  // kept for compatibility
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
