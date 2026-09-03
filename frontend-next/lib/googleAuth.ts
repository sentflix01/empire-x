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
  window.google.accounts.id.renderButton(element, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signup_with',
    shape: 'rectangular',
    width: options.width || 384,
  });
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

