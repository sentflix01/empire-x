'use client';

/**
 * SplashScreen — brief brand screen on the first app page of a browser session.
 *
 * Audit F-045: it used to play the 1 MB intro video on every app page load and
 * hold the page for up to 4 s, which made the largest contentful paint 3–4 s
 * on mobile. Now it shows the static logo, only once per session, and goes
 * away as soon as the sign-in check finishes or after 800 ms at most.
 *
 * Skipped entirely on auth/landing pages where a splash would be confusing.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

// Auth/public pages that should never show the splash
const AUTH_PREFIXES = [
  '/login', '/register', '/forgot-password',
  '/reset-password', '/verify', '/auth/google/callback', '/landing',
];

export const MAX_SPLASH_MS = 800;
export const SPLASH_SEEN_KEY = 'nb_splash_seen';

function seenThisSession(): boolean {
  try { return sessionStorage.getItem(SPLASH_SEEN_KEY) === '1'; } catch { return false; }
}

function markSeen() {
  try { sessionStorage.setItem(SPLASH_SEEN_KEY, '1'); } catch { /* private mode: show again next time */ }
}

export default function SplashScreen() {
  const pathname = usePathname();
  const { isLoadingAuth } = useAuth();
  const isAuthPage = AUTH_PREFIXES.some(p => pathname.startsWith(p));

  // Rendered on the first paint (server HTML included) so there is no flash of
  // the page underneath; hidden right after mount when already seen.
  const [visible, setVisible] = useState(!isAuthPage);
  const [fading, setFading] = useState(false);

  const dismiss = useCallback(() => {
    setFading(true);
    window.setTimeout(() => setVisible(false), 200);
  }, []);

  useEffect(() => {
    if (isAuthPage || seenThisSession()) { setVisible(false); return; }
    markSeen();
    const t = window.setTimeout(dismiss, MAX_SPLASH_MS);
    return () => window.clearTimeout(t);
  }, [isAuthPage, dismiss]);

  useEffect(() => {
    if (visible && !isLoadingAuth) dismiss();
  }, [visible, isLoadingAuth, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Loading Nodbusiness"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.2s ease-out',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/nodbusiness-icon.svg"
        alt=""
        aria-hidden="true"
        width={160}
        height={160}
        style={{ borderRadius: '50%', backgroundColor: '#0a0a0a', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
      />
      <p
        style={{
          marginTop: 20,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#0a0a0a',
          userSelect: 'none',
        }}
      >
        Nodbusiness
      </p>
    </div>
  );
}
