'use client';
/**
 * GlobalErrorReporter.tsx
 *
 * Captures ALL unhandled JavaScript errors in the frontend and reports
 * them to the backend /api/devops/errors/report endpoint so they appear
 * in the DevOps Live Error Feed immediately.
 *
 * Captures:
 *  - window.onerror         (uncaught synchronous errors)
 *  - unhandledrejection      (unhandled Promise rejections)
 *  - React componentDidCatch (surfaced via ErrorBoundary)
 *
 * Rate-limited on server side. This component renders nothing — it
 * attaches listeners on mount and removes them on unmount.
 */
import { useEffect } from 'react';

const REPORT_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/devops/errors/report`;
const MAX_STACK  = 3000;   // chars — keep payloads small

// Debounce identical errors within a short window to avoid flooding
const recentlySent = new Set<string>();

async function report(payload: {
  message: string;
  name?: string;
  stack?: string | null;
  path?: string;
  context?: Record<string, unknown>;
}) {
  // Deduplicate: skip if same error reported in last 10 seconds
  const key = `${payload.name}::${payload.message.slice(0, 100)}`;
  if (recentlySent.has(key)) return;
  recentlySent.add(key);
  setTimeout(() => recentlySent.delete(key), 10_000);

  try {
    await fetch(REPORT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: payload.message.slice(0, 1000),
        name:    payload.name    || 'ClientError',
        stack:   payload.stack?.slice(0, MAX_STACK) || null,
        path:    payload.path    || (typeof window !== 'undefined' ? window.location.pathname : ''),
        context: payload.context || {},
      }),
      // Don't block the page — fire and forget
      keepalive: true,
    });
  } catch {
    // Never throw from error reporter
  }
}

// Export so ErrorBoundary can call it directly
export { report as reportClientError };

export default function GlobalErrorReporter() {
  useEffect(() => {
    // ── window.onerror — catches uncaught synchronous errors ──────────────
    const onError = (
      event:   Event | string,
      source?: string,
      lineno?: number,
      colno?:  number,
      error?:  Error,
    ) => {
      const message = typeof event === 'string' ? event : (error?.message || 'Unknown error');
      report({
        message,
        name:  error?.name  || 'Error',
        stack: error?.stack || `${source}:${lineno}:${colno}`,
        context: { source, lineno, colno },
      });
      return false; // don't suppress default browser error handling
    };

    // ── unhandledrejection — catches unhandled Promise rejections ─────────
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const error  = reason instanceof Error ? reason : null;
      report({
        message: error?.message || String(reason || 'Unhandled Promise rejection'),
        name:    error?.name    || 'UnhandledRejection',
        stack:   error?.stack   || null,
        context: { reason: String(reason) },
      });
    };

    window.addEventListener('error',             onError as EventListener);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error',             onError as EventListener);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  // Renders nothing — purely a side-effect component
  return null;
}
