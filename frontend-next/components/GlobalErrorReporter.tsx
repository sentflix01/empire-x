'use client';
/**
 * GlobalErrorReporter.tsx
 *
 * Captures ALL client-side errors and reports them to the DevOps Live Error
 * Feed. Uses the axios client (NOT raw fetch) so the API URL, CORS, and
 * credentials are guaranteed to match every other API call in the app.
 *
 * Interceptors are installed at MODULE SCOPE — before React renders — so
 * hydration errors are caught. Early errors are buffered and flushed when
 * the component mounts.
 */
import { useEffect } from 'react';
import client from '@/api/client';

interface ErrorPayload {
  message: string;
  name?: string;
  stack?: string | null;
  path?: string;
  context?: Record<string, unknown>;
}

// ── Buffer for pre-mount errors ──────────────────────────────────────────────
const buffer: ErrorPayload[] = [];
let mounted = false;

// ── Send via axios client (guaranteed same baseURL + CORS as login) ─────────
function send(payload: ErrorPayload) {
  if (!mounted) { buffer.push(payload); return; }
  client.post('/api/devops/errors/report', {
    message: payload.message.slice(0, 1000),
    name:    payload.name    || 'ClientError',
    stack:   payload.stack?.slice(0, 3000) || null,
    path:    payload.path    || (typeof window !== 'undefined' ? window.location.pathname : ''),
    context: payload.context || {},
  }).catch((e: unknown) => {
    // Surface capture failures in console so they're never fully invisible
    if (typeof console !== 'undefined') {
      const orig = (console.error as { _orig?: typeof console.error })._orig ?? console.error;
      orig('[DevOps] Error report failed:', e);
    }
  });
}

// ── Dedup ────────────────────────────────────────────────────────────────────
const recent = new Map<string, number>();
function shouldReport(msg: string): boolean {
  if (/React DevTools|act\(|Warning: Possible/.test(msg)) return false;
  const key = msg.slice(0, 100);
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < 10_000) return false;
  recent.set(key, now);
  for (const [k, t] of recent) { if (now - t > 30_000) recent.delete(k); }
  return true;
}

function extractMsg(args: unknown[]): string {
  return args.map(a => {
    if (typeof a === 'string') return a;
    if (a instanceof Error) return a.message;
    if (typeof a === 'object' && a !== null) { try { return JSON.stringify(a).slice(0, 200); } catch { return '[obj]'; } }
    return String(a);
  }).join(' ');
}

function capture(payload: ErrorPayload) {
  if (!shouldReport(payload.message)) return;
  send(payload);
}

// ── Module-scope interceptors — active from the instant this file loads ──────
if (typeof window !== 'undefined') {
  const orig = console.error;
  (console.error as { _orig?: typeof console.error })._orig = orig;
  console.error = (...args: unknown[]) => {
    orig(...args);
    capture({
      message: extractMsg(args).slice(0, 500),
      name: 'ConsoleError',
      stack: (args.find(a => a instanceof Error) as Error)?.stack ?? null,
      context: { source: 'console.error' },
    });
  };

  window.addEventListener('error', (e) => {
    capture({
      message: e.message || 'Unknown error',
      name: e.error?.name ?? 'Error',
      stack: e.error?.stack ?? `${e.filename}:${e.lineno}:${e.colno}`,
      context: { source: 'window.onerror' },
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    capture({
      message: e.reason instanceof Error ? e.reason.message : String(e.reason || 'Unhandled rejection'),
      name: e.reason instanceof Error ? e.reason.name : 'UnhandledRejection',
      stack: e.reason instanceof Error ? e.reason.stack : null,
      context: { source: 'unhandledrejection' },
    });
  });
}

// ── Component: flushes buffer on mount ───────────────────────────────────────
export default function GlobalErrorReporter() {
  useEffect(() => {
    mounted = true;
    for (const p of buffer) send(p);
    buffer.length = 0;
  }, []);
  return null;
}

export { send as reportClientError };
