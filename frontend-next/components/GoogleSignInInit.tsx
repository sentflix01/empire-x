'use client';

/**
 * GoogleSignInInit — no-op component kept for backwards compatibility.
 *
 * The Google Sign-In implementation no longer uses the GIS script
 * (accounts.google.com/gsi/client). Instead it uses the standard OAuth2
 * popup flow directly, which requires no script loading and makes no
 * requests to Google's CDN at page load time.
 *
 * This component is mounted in app/layout.tsx and intentionally does nothing.
 * It is kept so the import in layout.tsx doesn't need to change.
 */
export default function GoogleSignInInit() {
  return null;
}
