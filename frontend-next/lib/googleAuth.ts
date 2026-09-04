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
 *   storeToken(access_token);
 */
import client, { storeToken } from '@/api/client';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize?: (options: any) => void;
          prompt?: (callback?: (notification: any) => void) => void;
          renderButton?: (container: Element, options: any) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
let hasInitializedGoogleIdentity = false;

// GIS has one global credential callback. Keep that callback stable for the
// lifetime of the page and switch the consumer instead of calling
// google.accounts.id.initialize() again. Re-initialising is noisy in the
// console and, more importantly, causes GIS to discard the earlier callback.
let credentialHandler: ((response: { credential?: string }) => void) | null = null;

/**
 * Initialise Google Identity Services.
 * Must be called after the GSI script has loaded (window.google is available).
 */
export function initGoogleSignIn() {
  if (!GOOGLE_CLIENT_ID) {
    console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.');
    return;
  }
  if (!window.google?.accounts?.id || hasInitializedGoogleIdentity) return;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response: { credential?: string }) => {
      credentialHandler?.(response);
    },
  });
  hasInitializedGoogleIdentity = true;
}

let _resolve: ((value: unknown) => void) | null = null;
let _reject: ((reason?: unknown) => void) | null = null;

function handleCredentialResponse(response: { credential?: string }) {
  if (!_resolve) return;
  if (!response.credential) {
    _reject?.(new Error('Google did not return a sign-in credential.'));
    _resolve = null; _reject = null;
    return;
  }
  sendIdTokenToBackend(response.credential)
    .then(_resolve)
    .catch(_reject)
    .finally(() => { _resolve = null; _reject = null; });
}

async function sendIdTokenToBackend(idToken: string) {
  const res = await client.post('/api/auth/google', { id_token: idToken });
  const { access_token } = res.data;
  storeToken(access_token);
  return res.data;
}

/**
 * Render Google's own sign-in control. Unlike a synthetic One Tap prompt,
 * this is initiated by an explicit user gesture and is supported by mobile
 * Safari as well as desktop browsers.
 */
export function renderGoogleSignInButton(
  element: HTMLElement,
  options: {
    onSuccess: (result: { access_token?: string }) => void;
    onError: (error: Error) => void;
    width?: number;
    buttonText?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  },
) {
  if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id || !element) return false;

  credentialHandler = async (response) => {
    if (!response.credential) {
      options.onError(new Error('Google did not return a sign-in credential.'));
      return;
    }
    try {
      const result = await sendIdTokenToBackend(response.credential);
      options.onSuccess(result);
    } catch (error) {
      options.onError(error instanceof Error ? error : new Error('Google Sign-In failed.'));
    }
  };

  element.replaceChildren();

  // Use a custom button to avoid Google's personalized "Sign in as [Name]"
  // display which appears when the user is already signed into Chrome.
  // Instead we render a clean, branded button that triggers the credential popup.
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = [
    'display:flex', 'align-items:center', 'justify-content:center', 'gap:10px',
    `width:${options.width || 384}px`, 'max-width:100%', 'height:40px',
    'border:1px solid #dadce0', 'border-radius:6px', 'background:#fff',
    'color:#3c4043', 'font-family:Google Sans,sans-serif', 'font-size:14px',
    'font-weight:500', 'cursor:pointer', 'padding:0 16px', 'box-sizing:border-box',
    'transition:background 0.15s,box-shadow 0.15s',
  ].join(';');

  const label = options.buttonText === 'signup_with' ? 'Sign up with Google' : 'Sign in with Google';

  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    <span>${label}</span>
  `;

  btn.addEventListener('mouseover', () => { btn.style.boxShadow = '0 1px 3px rgba(0,0,0,.15)'; btn.style.background = '#f8f9fa'; });
  btn.addEventListener('mouseout', () => { btn.style.boxShadow = 'none'; btn.style.background = '#fff'; });
  btn.addEventListener('click', () => {
    window.google?.accounts?.id?.prompt?.();
  });

  element.appendChild(btn);
  return true;
}

/**
 * Trigger the Google One Tap / FedCM sign-in flow.
 * Returns a promise that resolves with { access_token } on success.
 *
 * Mobile Safari + browsers that block third-party cookies cannot display One
 * Tap. In those cases the prompt fires isNotDisplayed() / isSkippedMoment()
 * almost immediately. Rather than trying to render a button on a detached
 * element (which is invisible and never clicked), we reject with a clear error
 * so the caller can fall back to a visible rendered button or email/password.
 *
 * The Login view now uses renderGoogleSignInButton() directly (same as
 * Register), so this function is only called by legacy paths.
 */
export function signInWithGoogle(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.id) {
      return reject(new Error('Google Sign-In is not available. Please try again or use email/password.'));
    }

    _resolve = resolve;
    _reject = reject;
    credentialHandler = handleCredentialResponse;

    window.google.accounts.id.prompt((notification: {
      isNotDisplayed: () => boolean;
      isSkippedMoment: () => boolean;
      isDismissedMoment: () => boolean;
      getDismissedReason: () => string;
    }) => {
      if (notification.isNotDisplayed()) {
        // One Tap cannot display — browser blocks third-party cookies (Safari,
        // Firefox strict mode) or the feature is suppressed by Google.
        // Reject cleanly so the UI can surface an actionable error.
        _resolve = null; _reject = null;
        reject(new Error(
          'Google Sign-In popup could not be shown. ' +
          'Please use the Google button at the top of the page or sign in with email and password.',
        ));
        return;
      }
      if (notification.isSkippedMoment()) {
        // User previously dismissed — tap was skipped silently.
        _resolve = null; _reject = null;
        reject(new Error(
          'Google Sign-In was skipped. Please use the Google button to try again.',
        ));
        return;
      }
      if (notification.isDismissedMoment?.()) {
        const reason = notification.getDismissedReason?.();
        if (reason === 'credential_returned') return; // handled by credential callback
        _resolve = null; _reject = null;
        reject(new Error('Sign-in popup was closed. Please try again.'));
      }
    });
  });
}

