/**
 * errorCollector.js — Central error capture and storage for the DevOps feed
 *
 * Every error that occurs in the Nodbusiness backend flows through here.
 * Errors are stored in `error_events` table and the DevOps panel polls
 * that table to show a live error feed to engineers.
 *
 * Usage:
 *   const { captureError } = require('./errorCollector');
 *
 *   // In a route handler:
 *   captureError(err, { req, level: 'error', source: 'route' });
 *
 *   // Standalone:
 *   captureError(new Error('Something broke'), { source: 'manual', context: { userId } });
 *
 * The module also exports:
 *   - errorMiddleware   — Express error handler (replaces global handler call)
 *   - installProcessHandlers — attaches process.on('uncaughtException') etc.
 */
const crypto = require('crypto');
const logger = require('./logger');

// Lazy-load pool to avoid circular require during startup
let _pool = null;
function getPool() {
  if (!_pool) _pool = require('../db/pool');
  return _pool;
}

// ── Fingerprint ───────────────────────────────────────────────────────────────
// Groups the same recurring error so we increment occurrence count instead
// of creating thousands of duplicate rows.
function fingerprint(err, path) {
  const key = [
    err.name || 'Error',
    // Top 2 non-node_modules stack lines
    (err.stack || '')
      .split('\n')
      .filter(l => l.includes('at ') && !l.includes('node_modules') && !l.includes('(node:'))
      .slice(0, 2)
      .join('|'),
    path || '',
  ].join('::');
  return crypto.createHash('md5').update(key).digest('hex');
}

// ── Core capture function ─────────────────────────────────────────────────────
/**
 * @param {Error|string} err
 * @param {{
 *   req?: import('express').Request,
 *   level?: 'error'|'warn'|'info'|'critical',
 *   source?: 'server'|'route'|'client'|'manual',
 *   statusCode?: number,
 *   context?: Record<string,any>
 * }} opts
 */
async function captureError(err, opts = {}) {
  try {
    const error   = err instanceof Error ? err : new Error(String(err));
    const level   = opts.level   || 'error';
    const source  = opts.source  || 'route';
    const req     = opts.req;
    const context = opts.context || {};

    const method     = req?.method     || null;
    const path       = req?.path       || req?.url || null;
    const statusCode = opts.statusCode || null;
    const requestId  = req?.headers?.['x-request-id'] || null;
    const userId     = req?.user?.id   || null;
    const userAgent  = req?.headers?.['user-agent']?.slice(0, 200) || null;
    // Hash the IP for privacy — we never store raw IPs
    const rawIp      = req?.ip || req?.connection?.remoteAddress || null;
    const ip         = rawIp ? crypto.createHash('sha256').update(rawIp).digest('hex').slice(0, 16) : null;

    const fp = fingerprint(error, path);

    const pool = getPool();

    // Upsert: if same fingerprint seen in last 24h, increment occurrence
    await pool.query(`
      INSERT INTO error_events
        (message, name, stack, code, method, path, status_code, user_id, request_id,
         ip, user_agent, context, fingerprint, level, source, occurrence, first_seen_at, last_seen_at)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,1,NOW(),NOW())
      ON CONFLICT (fingerprint) WHERE (last_seen_at > NOW() - INTERVAL '24 hours' AND resolved = false)
      DO UPDATE SET
        occurrence   = error_events.occurrence + 1,
        last_seen_at = NOW(),
        -- Update stack/context with latest occurrence details
        stack        = EXCLUDED.stack,
        context      = error_events.context || EXCLUDED.context
    `, [
      error.message?.slice(0, 2000) || 'Unknown error',
      error.name   || 'Error',
      error.stack  || null,
      error.code   || null,
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
    ]).catch(dbErr => {
      // Table may not exist yet — log but don't crash
      if (dbErr.code !== '42P01') {  // 42P01 = undefined_table
        logger.warn({ err: dbErr.message }, 'errorCollector: DB write failed');
      }
    });
  } catch (collectorErr) {
    // Never throw from error collector — it would cause an infinite loop
    logger.warn({ err: collectorErr.message }, 'errorCollector: unexpected failure');
  }
}

// ── Express error middleware ──────────────────────────────────────────────────
// Drop-in replacement for the global error handler in index.js
function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    logger.warn({ err: err.message }, 'Error after headers sent — ignoring');
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  const level      = statusCode >= 500 ? 'error' : 'warn';

  // Capture async (don't await — never block the response)
  captureError(err, { req, level, source: 'route', statusCode });

  logger.error({ err: err.message, stack: err.stack, path: req.path }, 'Unhandled route error');

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  res.status(statusCode).json({ error: err.message || 'Internal server error' });
}

// ── Process-level handlers ────────────────────────────────────────────────────
// Catches crashes that happen outside of Express (e.g. in workers, timers)
function installProcessHandlers() {
  process.on('uncaughtException', (err) => {
    logger.error({ err: err.message, stack: err.stack }, 'UNCAUGHT EXCEPTION');
    captureError(err, { source: 'server', level: 'critical' });
    // Give the DB write ~500ms to complete before crashing
    setTimeout(() => process.exit(1), 500);
  });

  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.error({ err: err.message, stack: err.stack }, 'UNHANDLED REJECTION');
    captureError(err, { source: 'server', level: 'error' });
  });

  logger.info('Process-level error handlers installed');
}

module.exports = { captureError, errorMiddleware, installProcessHandlers };
