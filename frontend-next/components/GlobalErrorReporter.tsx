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

// Must match NEXT_PUBLIC_API_BASE_URL (the var every other client uses).
// An empty base would post to the frontend origin, where /api/devops/* does
// not exist — silently discarding every client error report.
const API_BASE   = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const REPORT_URL = `${API_BASE}/api/devops/errors/report`;
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
      return false;
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

    // ── console.error — catches React hydration errors, warnings, and any
    //    library-level error logging that doesn't throw ────────────────────
    const origConsoleError = console.error.bind(console);
    const onConsoleError = (...args: unknown[]) => {
      origConsoleError(...args);
      const message = args.map(a =>
        typeof a === 'string' ? a :
        a instanceof Error ? a.message :
        JSON.stringify(a).slice(0, 200)
      ).join(' ');
      // Filter noise: React DevTools suggestion, act() warnings
      if (/React DevTools|act\(|Warning: Possible/.test(message)) return;
      report({
        message: message.slice(0, 500),
        name: 'ConsoleError',
        stack: args.find(a => a instanceof Error)?.stack ?? null,
        context: { source: 'console.error', args: args.length },
      });
    };
    console.error = onConsoleError as typeof console.error;

    window.addEventListener('error',             onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error',             onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      console.error = origConsoleError;
    };
  }, []);

  // Renders nothing — purely a side-effect component
  return null;
}
