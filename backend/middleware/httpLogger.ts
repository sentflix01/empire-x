/**
 * middleware/httpLogger.ts — Structured HTTP access log
 *
 * Emits a Pino log entry on each completed response.
 * Mount after requestId middleware so req.requestId is populated.
 */
import type { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';
import { redactUrl } from '../lib/redact';

export default function httpLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    logger.info({
      method: req.method,
      // Guest order tokens and signed-link signatures are credentials (F-015).
      url: redactUrl(req.originalUrl ?? req.url),
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - start,
      requestId: req.requestId,
    }, 'http');
  });

  next();
}

module.exports = httpLogger;
