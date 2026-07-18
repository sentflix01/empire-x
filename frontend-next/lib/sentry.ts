// @ts-nocheck
/**
 * sentry.ts — Frontend Sentry initialisation shim.
 *
 * Initialises @sentry/nextjs when NEXT_PUBLIC_SENTRY_DSN is set.
 * No-ops silently when the DSN is absent (development, CI).
 *
 * Feature: professional-grade-upgrade
 * Requirements: 5.2, 5.4
 */

// Dynamically import Sentry to avoid crashing when the package is absent
let _Sentry: any = null;

async function getSentry() {
  if (_Sentry !== null) return _Sentry;
  try {
    _Sentry = await (new Function('return import("@sentry/nextjs")')() as Promise<any>);
  } catch {
    _Sentry = undefined; // package not installed
  }
  return _Sentry;
}

export async function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return; // silently skip — no DSN configured

  const Sentry = await getSentry();
  if (!Sentry) return;

  const isProd = process.env.NODE_ENV === 'production';

  Sentry.init({
    dsn,
    tracesSampleRate: isProd ? 0.2 : 0,
    environment: process.env.NODE_ENV || 'development',
    // Expose to ErrorBoundary via globalThis
    integrations: [],
  });

  // Expose for ErrorBoundary.componentDidCatch
  (globalThis as any).__SENTRY__ = Sentry;
}

export async function captureError(err: unknown, context?: Record<string, unknown>) {
  const Sentry = await getSentry();
  if (Sentry?.captureException) {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } else {
    console.error(err, context);
  }
}

export async function setSentryUser(user: { id: string; email?: string } | null) {
  const Sentry = await getSentry();
  if (!Sentry?.setUser) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}
