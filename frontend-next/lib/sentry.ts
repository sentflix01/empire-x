/**
 * sentry.ts — Frontend error tracking shim.
 *
 * Install a frontend Sentry SDK before enabling browser error reporting.
 */

export function initSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  console.warn('NEXT_PUBLIC_SENTRY_DSN is set, but no frontend Sentry SDK is installed.');
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  console.error(err, context);
}

export function setSentryUser(user: { id: string; email?: string } | null) {
  void user;
}
