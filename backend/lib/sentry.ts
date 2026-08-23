/**
 * lib/sentry.ts — Optional Sentry error tracking
 *
 * Set SENTRY_DSN in .env to enable.
 * Falls back silently when not configured.
 */
import type { Application, RequestHandler, ErrorRequestHandler } from 'express';
import logger from './logger';

export function initSentry(app: Application): void {
  if (!process.env.SENTRY_DSN) {
    logger.debug('Sentry not configured — skipping (add SENTRY_DSN to enable)');
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const Sentry = require('@sentry/node') as any;

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      release: `nodbusiness-backend@${(require('../package.json') as { version: string }).version}`,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      ignoreErrors: ['TokenExpiredError', 'JsonWebTokenError', 'NotFoundError'],
    });

    // @sentry/node v7 uses Handlers; v8+ uses different APIs — try both
    if (Sentry.Handlers?.requestHandler) {
      app.use(Sentry.Handlers.requestHandler() as RequestHandler);
    } else if (typeof Sentry.setupExpressErrorHandler === 'function') {
      Sentry.setupExpressErrorHandler(app);
    }
    logger.info('Sentry error tracking enabled');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Failed to initialise Sentry');
  }
}

export function getSentryErrorHandler(): ErrorRequestHandler | null {
  if (!process.env.SENTRY_DSN) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const Sentry = require('@sentry/node') as any;
    if (Sentry.Handlers?.errorHandler) return Sentry.Handlers.errorHandler() as ErrorRequestHandler;
    return null;
  } catch {
    return null;
  }
}

module.exports = { initSentry, getSentryErrorHandler };
