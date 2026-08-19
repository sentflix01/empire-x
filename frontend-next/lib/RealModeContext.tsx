'use client';
/**
 * RealModeContext — global toggle between "All users" and "Real users only" mode.
 *
 * When realMode = true:
 *   - All API requests send the header X-Real-Only: 1
 *   - The backend filters out all seed/demo users (is_seed = TRUE) from every response
 *   - Feed, profiles, messages, suggestions, search — everything shows real users only
 *
 * When realMode = false (default):
 *   - Normal mode — seed users and real users are mixed together
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import client from '@/api/client';

const STORAGE_KEY = 'nodbusiness_real_mode';

interface RealModeContextValue {
  realMode: boolean;
  toggleRealMode: () => void;
  setRealMode: (v: boolean) => void;
}

const RealModeContext = createContext<RealModeContextValue>({
  realMode: false,
  toggleRealMode: () => {},
  setRealMode: () => {},
});

// Axios interceptor ID — stored so we can eject when the provider unmounts
let _interceptorId: number | null = null;

export function RealModeProvider({ children }: { children: ReactNode }) {
  const [realMode, setRealModeState] = useState(false);

  // Initialise from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') {
      setRealModeState(true);
    }
  }, []);

  // Sync Axios interceptor whenever realMode changes
  useEffect(() => {
    // Remove old interceptor
    if (_interceptorId !== null) {
      client.interceptors.request.eject(_interceptorId);
      _interceptorId = null;
    }

    if (realMode) {
      _interceptorId = client.interceptors.request.use(config => {
        config.headers['X-Real-Only'] = '1';
        return config;
      });
    }

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, String(realMode));
  }, [realMode]);

  const setRealMode = (v: boolean) => setRealModeState(v);
  const toggleRealMode = () => setRealModeState(v => !v);

  return (
    <RealModeContext.Provider value={{ realMode, toggleRealMode, setRealMode }}>
      {children}
    </RealModeContext.Provider>
  );
}

export const useRealMode = () => useContext(RealModeContext);
