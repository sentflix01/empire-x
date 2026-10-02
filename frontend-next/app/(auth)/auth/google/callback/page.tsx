'use client';
/**
 * /auth/google/callback
 *
 * OAuth2 popup redirect target. After the user signs in Google redirects
 * the popup here with the id_token in the URL fragment:
 *   http://localhost:3002/auth/google/callback#id_token=xxx&state=yyy
 *
 * This page sends the token back to the opener via two channels:
 *   1. BroadcastChannel (COOP-safe, primary) — keyed by state parameter
 *   2. window.postMessage (fallback for older browsers)
 *
 * Then closes itself. If close() is blocked, redirects to / so the popup
 * doesn't linger showing the login page.
 *
 * COOP note: this page gets Cross-Origin-Opener-Policy: unsafe-none
 * (set in next.config.ts) so window.opener is accessible and postMessage works.
 * BroadcastChannel works regardless of COOP since it's same-origin.
 */
import { useEffect } from 'react';

export default function GoogleCallbackPage() {
  useEffect(() => {
    const hash   = window.location.hash.slice(1); // strip leading #
    const params = new URLSearchParams(hash);

    const idToken = params.get('id_token');
    const error   = params.get('error');
    const errorDescription = params.get('error_description');
    const state   = params.get('state');

    const payload = idToken
      ? { type: 'GOOGLE_OAUTH_CALLBACK', id_token: idToken }
      : { type: 'GOOGLE_OAUTH_CALLBACK', error: errorDescription || error || 'no_id_token' };

    // ── 1. BroadcastChannel (primary, COOP-safe) ─────────────────────────────
    if (state && typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel(`google_oauth_${state}`);
        ch.postMessage(payload);
        // Small delay so the opener has time to receive before we close
        setTimeout(() => { ch.close(); }, 300);
      } catch { /* ignore — fall through to postMessage */ }
    }

    // ── 2. window.postMessage fallback ───────────────────────────────────────
    try {
      if (window.opener && typeof window.opener.postMessage === 'function') {
        window.opener.postMessage(payload, window.location.origin);
      }
    } catch { /* COOP may block this — BroadcastChannel above covers it */ }

    // ── Close the popup ───────────────────────────────────────────────────────
    setTimeout(() => {
      window.close();
      // If window.close() didn't work (rare), redirect away so the popup
      // doesn't navigate back to the login page.
      setTimeout(() => {
        try {
          if (!window.closed) window.location.replace('/');
        } catch { /* ignore */ }
      }, 600);
    }, 350);
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'system-ui, sans-serif',
      fontSize: '14px', color: '#5f6368', background: '#fff',
    }}>
      <div style={{ textAlign: 'center' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" style={{ marginBottom: 10 }}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <p style={{ margin: 0 }}>Completing sign-in…</p>
      </div>
    </div>
  );
}
