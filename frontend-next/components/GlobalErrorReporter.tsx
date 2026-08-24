'use client';
import { useEffect } from 'react';
/**
 * GlobalErrorReporter.tsx
 *
 * Captures ALL client-side errors and reports them to the DevOps Live Error
 * Feed: /api/devops/errors/report
 *
 * Captures:
 *  - window.onerror            (uncaught synchronous errors)
 *  - unhandledrejection        (unhandled Promise rejections)
 *  - console.error             (React hydration, library errors, warnings)
 *
 * CRITICAL: All interceptors are installed at MODULE SCOPE — the instant
 * this file is imported, BEFORE React renders. This is the only way to
 * catch hydration errors, which fire during the initial render pass.
 * Early errors (before the component mounts) are buffered and flushed
 * when GlobalErrorReporter mounts.
 *
 * This is the same pattern Sentry and Datadog RUM use.
 */

// ── Module-scope setup — runs at import time, before any React render ────────

const API_BASE   = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const REPORT_URL = `${API_BASE}/api/devops/errors/report`;
const MAX_STACK  = 3000;

// Dedup: same error won't report twice within 10s
const recentlySent = new Map<string, number>();

// Buffer for errors that fire before the reporter is ready to send
const earlyBuffer: Array<Record<string, unknown>> = [];
let readyToSend = false;

// Save originals so cleanup can restore them
const _origConsoleError = typeof console !== 'undefined' ? console.error : null;

function shouldReport(message: string): boolean {
  // Filter React dev noise that isn't actionable
  if (/React DevTools|act\(|Warning: Possible/.test(message)) return false;
  // Dedup within 10 seconds
  const key = message.slice(0, 100);
  const now = Date.now();
  const last = recentlySent.get(key);
  if (last && now - last < 10_000) return false;
  recentlySent.set(key, now);
  // Prune old entries
  for (const [k, t] of recentlySent) { if (now - t > 30_000) recentlySent.delete(k); }
  return true;
}

async function send(payload: {
  message: string;
  name?: string;
  stack?: string | null;
  path?: string;
  context?: Record<string, unknown>;
}) {
  if (!shouldReport(payload.message)) return;
  try {
    await fetch(REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: payload.message.slice(0, 1000),
        name:    payload.name    || 'ClientError',
        stack:   payload.stack?.slice(0, MAX_STACK) || null,
        path:    payload.path    || (typeof window !== 'undefined' ? window.location.pathname : ''),
        context: payload.context || {},
      }),
      keepalive: true,
    });
  } catch { /* never throw from error reporter */ }
}

function extractMessage(args: unknown[]): string {
  return args.map(a =>
    typeof a === 'string' ? a :
    a instanceof Error ? a.message :
    typeof a === 'object' && a !== null ? (() => { try { return JSON.stringify(a).slice(0, 200); } catch { return '[object]'; } })() :
    String(a)
  ).join(' ');
}

// ── Install interceptors at MODULE SCOPE ─────────────────────────────────────
// These fire the instant this module is imported — before React renders.
if (typeof window !== 'undefined') {
  // 1. console.error — catches hydration errors, React warnings, library errors
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    origError(...args);
    const msg = extractMessage(args);
    const payload = {
      message: msg.slice(0, 500),
      name: 'ConsoleError',
      stack: (args.find(a => a instanceof Error) as Error)?.stack ?? null,
      path: window.location.pathname,
      context: { source: 'console.error' },
    };
    if (readyToSend) send(payload);
    else earlyBuffer.push(payload);
  };

  // 2. window.onerror — uncaught synchronous errors
  window.addEventListener('error', (event) => {
    const payload = {
      message: event.message || 'Unknown error',
      name: 'Error',
      stack: event.error?.stack ?? `${event.filename}:${event.lineno}:${event.colno}`,
      path: window.location.pathname,
      context: { source: 'window.onerror' },
    };
    if (readyToSend) send(payload);
    else earlyBuffer.push(payload);
  });

  // 3. unhandledrejection — unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const payload = {
      message: reason instanceof Error ? reason.message : String(reason || 'Unhandled rejection'),
      name: reason instanceof Error ? reason.name : 'UnhandledRejection',
      stack: reason instanceof Error ? reason.stack : null,
      path: window.location.pathname,
      context: { source: 'unhandledrejection' },
    };
    if (readyToSend) send(payload);
    else earlyBuffer.push(payload);
  });
}

// ── Component: flushes the early buffer on mount ─────────────────────────────

export default function GlobalErrorReporter() {
  useEffect(() => {
    readyToSend = true;
    // Flush any errors that fired between module import and component mount
    for (const p of earlyBuffer) { send(p as { message: string; name?: string; stack?: string | null; path?: string; context?: Record<string, unknown> }); }
    earlyBuffer.length = 0;
  }, []);

  return null;
}

// Export so ErrorBoundary can call it directly
export { send as reportClientError };
