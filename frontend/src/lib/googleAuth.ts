// @ts-nocheck
/**
 * Google Sign-In helper using the Google Identity Services library.
 * The GSI script is loaded in index.html.
 *
 * Usage:
 *   import { initGoogleSignIn, signInWithGoogle } from '@/lib/googleAuth';
 *
 *   // Call once when the component mounts
 *   initGoogleSignIn();
 *
 *   // Call on button click — resolves with the access_token from our backend
 *   const { access_token } = await signInWithGoogle();
 *   localStorage.setItem('access_token', access_token);
 */
import client from '@/api/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Initialise Google Identity Services.
 * Must be called after the GSI script has loaded (window.google is available).
 */
export function initGoogleSignIn() {
  if (!GOOGLE_CLIENT_ID) {
    console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.');
    return;
  }
  if (!window.google?.accounts?.id) return; // GSI not loaded yet — safe to ignore

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
  });
}

let _resolve = null;
let _reject = null;

function handleCredentialResponse(response) {
  if (!_resolve) return;
  sendIdTokenToBackend(response.credential)
    .then(_resolve)
    .catch(_reject)
    .finally(() => { _resolve = null; _reject = null; });
}

async function sendIdTokenToBackend(idToken) {
  const res = await client.post('/api/auth/google', { id_token: idToken });
  const { access_token } = res.data;
  localStorage.setItem('access_token', access_token);
  return res.data;
}

/**
 * Trigger the Google One Tap / sign-in popup.
 * Returns a promise that resolves with { access_token } on success.
 */
export function signInWithGoogle() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.id) {
      return reject(new Error('Google Sign-In is not available'));
    }
    _resolve = resolve;
    _reject = reject;
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: open the popup directly
        window.google.accounts.id.renderButton(
          document.createElement('div'),
          { theme: 'outline', size: 'large' }
        );
        window.google.accounts.id.prompt();
      }
    });
  });
}

