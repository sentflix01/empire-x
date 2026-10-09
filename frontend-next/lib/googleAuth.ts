/**
 * googleAuth.ts — Google Sign-In via OAuth 2.0 popup (no GIS script).
 *
 * Uses standard OAuth2 implicit flow for id_token.
 * Popup → Google → /auth/google/callback → BroadcastChannel → opener.
 *
 * COOP-safe: never reads popup.closed or window.opener across origins.
 * BroadcastChannel works even when COOP isolates the browsing context.
 */
import client, { storeToken } from '@/api/client';

const GOOGLE_AUTH   = 'https://accounts.google.com/o/oauth2/v2/auth';
const CALLBACK_PATH = '/auth/google/callback';

function getClientId(): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
  // Fail closed for copied .env.example placeholders and malformed values.
  // This cannot detect a deleted OAuth client; Google reports that at runtime.
  return /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId) ? clientId : '';
}

export function describeGoogleOAuthError(error: string): string {
  const normalized = error.toLowerCase();
  if (normalized.includes('invalid_client') || normalized.includes('oauth client was not found')) {
    return 'Google sign-in is misconfigured: the OAuth client ID was not found. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to an active Web application client in the frontend environment, and set the same ID as GOOGLE_CLIENT_ID in the backend. Add this site origin and /auth/google/callback to the client settings.';
  }
  return error;
}

function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

interface GoogleAuthResult {
  access_token: string;
  onboarding_mode?: 'demo' | 'real' | null;
  is_demo?: boolean;
}

async function sendToBackend(idToken: string): Promise<GoogleAuthResult> {
  const res = await client.post<GoogleAuthResult>(
    '/api/auth/google',
    { id_token: idToken },
    { headers: { 'X-Account-Mode': 'real' } },
  );
  storeToken(res.data.access_token);
  return res.data;
}

/**
 * Open the Google OAuth2 popup and resolve with an id_token.
 *
 * Communication strategy (COOP-safe):
 *   Primary:  BroadcastChannel — works even when COOP isolates the popup
 *             context after navigating through Google's cross-origin domain.
 *   Fallback: window.postMessage — works when BroadcastChannel is unavailable
 *             (some older browsers / test environments).
 *
 * We never poll popup.closed (that throws COOP errors).
 * The popup signals completion via BroadcastChannel then closes itself.
 * A 5-minute timeout covers abandoned popups and Google-side errors (such as
 * invalid_client) that are rendered by Google without redirecting to callback.
 */
function openGooglePopup(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = getClientId();
    if (!clientId) {
      reject(new Error('Google Sign-In is not configured.'));
      return;
    }

    const nonce     = randomHex(16);
    const state     = randomHex(16);
    const channelId = `google_oauth_${state}`;
    const redirectUri = `${window.location.origin}${CALLBACK_PATH}`;

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: 'id_token',
      scope:         'openid email profile',
      nonce,
      state,
      prompt:        'select_account',
    });

    const W = 500, H = 600;
    const left = Math.round(window.screenX + (window.outerWidth  - W) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - H) / 2);

    const popup = window.open(
      `${GOOGLE_AUTH}?${params}`,
      'google_oauth',
      `width=${W},height=${H},left=${left},top=${top},` +
      'toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes',
    );

    if (!popup) {
      reject(new Error('Sign-in popup was blocked. Please allow popups for this site and try again.'));
      return;
    }

    let settled = false;

    // ── BroadcastChannel (primary, COOP-safe) ─────────────────────────────────
    const channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(channelId)
      : null;

    function settle(data: { id_token?: string; error?: string }) {
      if (settled) return;
      settled = true;
      cleanup();
      if (data.id_token) {
        resolve(data.id_token);
      } else {
        reject(new Error(data.error ? `Google Sign-In failed: ${describeGoogleOAuthError(data.error)}` : 'Google Sign-In did not return an ID token.'));
      }
    }

    function cleanup() {
      clearTimeout(timeoutId);
      channel?.close();
      window.removeEventListener('message', onMessage);
    }

    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_OAUTH_CALLBACK') {
          settle(event.data);
        }
      };
    }

    // ── postMessage fallback ──────────────────────────────────────────────────
    function onMessage(event: MessageEvent) {
      const ownOrigin = window.location.origin;
      // Allow same origin or empty origin (jsdom / test environments)
      if (event.origin && event.origin !== ownOrigin) return;
      if (!event.data || event.data.type !== 'GOOGLE_OAUTH_CALLBACK') return;
      settle(event.data);
    }
    window.addEventListener('message', onMessage);

    // ── 5-minute timeout — Google may show an error without calling back ──────
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Google sign-in did not complete. Close the Google window and verify that this site uses an active OAuth client configured for its domain.'));
      }
    }, 5 * 60 * 1000);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/** No-op — kept for backwards compat with GoogleSignInInit.tsx. */
export function initGoogleSignIn(): void { /* no GIS to initialise */ }

/** Always ready — no async script loading needed. */
export function isGoogleReady(): boolean { return Boolean(getClientId()); }

export interface RenderGoogleButtonOptions {
  onSuccess: (result: {
    access_token: string;
    onboarding_mode?: 'demo' | 'real' | null;
    is_demo?: boolean;
  }) => void;
  onError:   (error: Error) => void;
  width?:      number;
  buttonText?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
}

export function renderGoogleSignInButton(
  element: HTMLElement,
  options: RenderGoogleButtonOptions,
): boolean {
  if (!getClientId() || !element) return false;

  const label = options.buttonText === 'signup_with' ? 'Sign up with Google' : 'Sign in with Google';

  element.replaceChildren();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', label);

  Object.assign(btn.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '10px', width: '100%', height: '40px',
    border: '1px solid #dadce0', borderRadius: '6px',
    background: '#ffffff', color: '#3c4043',
    fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
    fontSize: '14px', fontWeight: '500', cursor: 'pointer',
    padding: '0 16px', boxSizing: 'border-box',
    transition: 'background 0.15s, box-shadow 0.15s',
    outline: 'none', userSelect: 'none',
  } as Partial<CSSStyleDeclaration>);

  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    <span>${label}</span>
  `;

  btn.addEventListener('mouseenter', () => { btn.style.background = '#f8f9fa'; btn.style.boxShadow = '0 1px 3px rgba(0,0,0,.15)'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = '#ffffff'; btn.style.boxShadow = 'none'; });
  btn.addEventListener('focus',      () => { btn.style.boxShadow = '0 0 0 3px rgba(66,133,244,.3)'; });
  btn.addEventListener('blur',       () => { btn.style.boxShadow = 'none'; });

  let pending = false;

  btn.addEventListener('click', async () => {
    if (pending) return;
    pending = true;
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
    try {
      const idToken = await openGooglePopup();
      const result  = await sendToBackend(idToken);
      options.onSuccess(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      if (msg !== 'Sign-in was cancelled.') {
        options.onError(new Error(msg));
      }
    } finally {
      pending = false;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  element.appendChild(btn);
  return true;
}
