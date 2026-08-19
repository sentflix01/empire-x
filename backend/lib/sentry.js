/**
 * sentry.js — Error tracking initialisation
 * 
 * Set SENTRY_DSN in .env to enable.
 * Get your DSN from https://sentry.io → Project → Settings → Client Keys
 */
const logger = require('./logger');

function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    logger.debug('Sentry not configured — skipping (add SENTRY_DSN to enable)');
    return;
  }

  try {
    const Sentry = require('@sentry/node');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: `nodbusiness-backend@${require('../package.json').version}`,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      // Don't send events for known non-critical errors
      ignoreErrors: [
        'TokenExpiredError',
        'JsonWebTokenError',
        'NotFoundError',
      ],
    });

    // RequestHandler must be the first middleware
    app.use(Sentry.Handlers.requestHandler());

    logger.info('Sentry error tracking enabled');
    return Sentry;
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to initialise Sentry');
  }
}

function getSentryErrorHandler() {
  if (!process.env.SENTRY_DSN) return null;
  try {
    const Sentry = require('@sentry/node');
    return Sentry.Handlers.errorHandler();
  } catch {
    return null;
  }
}

module.exports = { initSentry, getSentryErrorHandler };
