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
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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

export function RealModeProvider({ children }: { children: ReactNode }) {
  const [realMode, setRealModeState] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const interceptorId = useRef<number | null>(null);

  const syncInterceptor = (enabled: boolean) => {
    if (interceptorId.current !== null) {
      client.interceptors.request.eject(interceptorId.current);
      interceptorId.current = null;
    }
    if (enabled) {
      interceptorId.current = client.interceptors.request.use(config => {
        config.headers['X-Real-Only'] = '1';
        return config;
      });
    }
  };

  // Install the request policy before mounting any page that can fetch data.
  useEffect(() => {
    let saved = false;
    try { saved = localStorage.getItem(STORAGE_KEY) === 'true'; } catch { /* storage may be disabled */ }
    syncInterceptor(saved);
    setRealModeState(saved);
    setInitialized(true);
    return () => {
      if (interceptorId.current !== null) client.interceptors.request.eject(interceptorId.current);
      interceptorId.current = null;
    };
  }, []);

  const setRealMode = (enabled: boolean) => {
    // Update Axios synchronously so a query started by the same interaction
    // cannot escape before a passive effect installs the filter header.
    syncInterceptor(enabled);
    try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch { /* state still works for this page */ }
    setRealModeState(enabled);
  };
  const toggleRealMode = () => setRealMode(!realMode);

  return (
    <RealModeContext.Provider value={{ realMode, toggleRealMode, setRealMode }}>
      {initialized
        ? <React.Fragment key={realMode ? 'real-users' : 'all-users'}>{children}</React.Fragment>
        : <div className="min-h-screen" aria-busy="true" />}
    </RealModeContext.Provider>
  );
}

export const useRealMode = () => useContext(RealModeContext);
