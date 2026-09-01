'use client';
import { useEffect } from 'react';

let isGoogleInitialized = false;

/**
 * Loads the Google Identity Services script and wires up window.__googleSignIn.
 * This manually appends the external script to avoid Next.js inline loader scripts
 * that violate a strict production CSP with no unsafe-inline.
 */
export default function GoogleSignInInit() {
  useEffect(() => {
    if (isGoogleInitialized) return;
    isGoogleInitialized = true;

    let intervalId: number | undefined;
    let scriptElement: HTMLScriptElement | null = null;

    async function initialize() {
      if (!window.google?.accounts?.id) return false;

      const { initGoogleSignIn, signInWithGoogle } = await import('@/lib/googleAuth');
      initGoogleSignIn();
      (window as any).__googleSignIn = signInWithGoogle;
      return true;
    }

    const waitForGoogle = async () => {
      if (await initialize()) return;

      intervalId = window.setInterval(async () => {
        if (window.google?.accounts?.id) {
          window.clearInterval(intervalId);
          intervalId = undefined;
          await initialize();
        }
      }, 100);
    };

    const loadGoogleScript = () => {
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        void waitForGoogle();
        return;
      }

      scriptElement = document.createElement('script');
      scriptElement.src = 'https://accounts.google.com/gsi/client';
      scriptElement.async = true;
      scriptElement.defer = true;
      scriptElement.onload = () => {
        void waitForGoogle();
      };
      document.body.appendChild(scriptElement);
    };

    loadGoogleScript();

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
      if (scriptElement) {
        document.body.removeChild(scriptElement);
      }
    };
  }, []);

  return null;
}
