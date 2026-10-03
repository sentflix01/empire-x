/**
 * lib/errorCollector.ts — Central error capture and storage for the DevOps feed
 *
 * Every error flows through here. Errors are stored in `error_events` table
 * (deduplicated by fingerprint) and exposed via the built-in DevOps Hub.
 *
 * Exports:
 *   captureError(err, opts)   — store an error in the DB
 *   errorMiddleware           — Express global error handler
 *   installProcessHandlers()  — attaches uncaughtException / unhandledRejection
 */
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import logger from './logger';

// Lazy-load pool to avoid circular require during startup
let _pool: import('pg').Pool | null = null;
function getPool(): import('pg').Pool {
  if (!_pool) {
    const mod = require('../db/pool') as { default: import('pg').Pool };
    _pool = mod.default;
  }
  return _pool;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ErrorLevel = 'error' | 'warn' | 'info' | 'critical';
export type ErrorSource = 'server' | 'route' | 'client' | 'manual';

export interface CaptureOptions {
  req?: Request;
  level?: ErrorLevel;
  source?: ErrorSource;
  statusCode?: number;
  context?: Record<string, unknown>;
}

// ── Fingerprint ───────────────────────────────────────────────────────────────

function fingerprint(err: Error, path: string | null): string {
  const key = [
    err.name ?? 'Error',
    (err.stack ?? '')
      .split('\n')
      .filter((l) => l.includes('at ') && !l.includes('node_modules') && !l.includes('(node:'))
      .slice(0, 2)
      .join('|'),
    path ?? '',
  ].join('::');
  return crypto.createHash('md5').update(key).digest('hex');
}

// ── Core capture ──────────────────────────────────────────────────────────────

export async function captureError(err: Error | string, opts: CaptureOptions = {}): Promise<void> {
  try {
    const error   = err instanceof Error ? err : new Error(String(err));
    const level   = opts.level   ?? 'error';
    const source  = opts.source  ?? 'route';
    const req     = opts.req;
    const context = opts.context ?? {};

    const method     = req?.method    ?? null;
    const path       = req?.path      ?? req?.url ?? null;
    const statusCode = opts.statusCode ?? null;
    const requestId  = (req?.headers?.['x-request-id'] as string | undefined) ?? null;
    const userId     = (req as Request & { user?: { id?: string } })?.user?.id ?? null;
    const userAgent  = req?.headers?.['user-agent']?.slice(0, 200) ?? null;
    const rawIp      = req?.ip ?? null;
    const ip         = rawIp
      ? crypto.createHash('sha256').update(rawIp).digest('hex').slice(0, 16)
      : null;

    const fp = fingerprint(error, path);

    await getPool().query(`
      INSERT INTO error_events
        (message, name, stack, code, method, path, status_code, user_id, request_id,
         ip, user_agent, context, fingerprint, level, source, occurrence, first_seen_at, last_seen_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,1,NOW(),NOW())
      ON CONFLICT (fingerprint) DO UPDATE SET
        occurrence   = error_events.occurrence + 1,
        last_seen_at = NOW(),
        stack        = EXCLUDED.stack,
        context      = error_events.context || EXCLUDED.context
      WHERE error_events.resolved = false
        AND error_events.last_seen_at > NOW() - INTERVAL '24 hours'
    `, [
      error.message?.slice(0, 2000) ?? 'Unknown error',
      error.name   ?? 'Error',
      error.stack  ?? null,
      (error as NodeJS.ErrnoException).code ?? null,
      method,
      path,
      statusCode,
      userId,
      requestId,
      ip,
      userAgent,
      JSON.stringify(context),
      fp,
      level,
      source,
    ]).catch((dbErr: Error & { code?: string }) => {
      if (dbErr.code !== '42P01') { // 42P01 = undefined_table
        logger.warn({ err: dbErr.message }, 'errorCollector: DB write failed');
      }
    });
  } catch (collectorErr) {
    logger.warn({ err: (collectorErr as Error).message }, 'errorCollector: unexpected failure');
  }
}

// ── Express global error middleware ───────────────────────────────────────────

export function errorMiddleware(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    logger.warn({ err: err.message }, 'Error after headers sent — ignoring');
    return;
  }

  const statusCode = err.status ?? err.statusCode ?? 500;
  const level: ErrorLevel = statusCode >= 500 ? 'error' : 'warn';

  captureError(err, { req, level, source: 'route', statusCode });
  logger.error({ err: err.message, stack: err.stack, path: req.path }, 'Unhandled route error');

  if ((err as NodeJS.ErrnoException).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large' });
    return;
  }
  // 4xx messages are caller-actionable and safe to echo. 5xx internals
  // (driver errors, stack details) must never reach the client.
  if (statusCode >= 500) {
    res.status(statusCode).json({ error: 'Internal server error' });
    return;
  }
  res.status(statusCode).json({ error: err.message ?? 'Request failed' });
}

// ── Process-level crash handlers ──────────────────────────────────────────────

let processHandlersInstalled = false;

export function installProcessHandlers(): void {
  if (processHandlersInstalled) return;
  processHandlersInstalled = true;

  // Single owner of process-level crash handling. index.ts must NOT register
  // competing listeners — Node runs them in registration order, so two
  // uncaughtException handlers with different exit policies produce
  // order-dependent behavior.

  process.on('uncaughtException', (err: Error & { code?: string }) => {
    // Express emits this when a second res.json()/res.end() races a finished
    // response. It is noisy but not fatal — killing the server over it causes
    // restart loops under load.
    if (err.code === 'ERR_HTTP_HEADERS_SENT' || err.message?.includes('Cannot set headers after they are sent')) {
      logger.warn({ err: err.message }, 'Double response detected — ignoring');
      captureError(err, { source: 'server', level: 'warn' }).catch(() => undefined);
      return;
    }
    logger.error({ err: err.message, stack: err.stack }, 'UNCAUGHT EXCEPTION');
    captureError(err, { source: 'server', level: 'critical' })
      .catch(() => undefined)
      .finally(() => {
        // Give in-flight logs/telemetry ~500ms to flush before exiting.
        setTimeout(() => process.exit(1), 500);
      });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    const msg = err.message ?? '';

    // Upstash free-tier quota exhausted — demote to warn, do NOT capture to DB.
    // The redis.ts error handler will switch to no-op; these are expected cascades.
    if (msg.includes('max requests limit exceeded')) {
      logger.warn({ err: msg }, 'Redis quota limit — degraded to no-op (unhandled rejection suppressed)');
      return;
    }

    logger.error({ err: msg, stack: err.stack }, 'UNHANDLED REJECTION');
    captureError(err, { source: 'server', level: 'error' }).catch(() => undefined);
  });

  logger.info('Process-level error handlers installed');
};

module.exports = { captureError, errorMiddleware, installProcessHandlers };
