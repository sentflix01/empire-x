'use client';
import Script from 'next/script';

/**
 * Loads the Google Identity Services script and wires up window.__googleSignIn.
 * Must be a Client Component because it uses the Script onLoad callback.
 */
export default function GoogleSignInInit() {
  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={() => {
        import('@/lib/googleAuth').then(({ initGoogleSignIn, signInWithGoogle }) => {
          initGoogleSignIn();
          (window as any).__googleSignIn = signInWithGoogle;
        });
      }}
    />
  );
}
