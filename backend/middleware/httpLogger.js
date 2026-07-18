/**
 * httpLogger.js — Structured HTTP access log middleware
 *
 * Emits a Pino log entry on each completed HTTP response with:
 *   method, url, statusCode, responseTimeMs, requestId
 *
 * Mount after requestId middleware so req.requestId is populated.
 */
const logger = require('../lib/logger');

module.exports = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - start,
      requestId: req.requestId,
    }, 'http');
  });

  next();
};
