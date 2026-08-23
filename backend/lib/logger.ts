/**
 * lib/logger.ts — Structured logging with Pino
 *
 * Outputs JSON in production (for log aggregators like Datadog, Logtail).
 * Pretty-prints in development.
 *
 * Usage:
 *   import logger from './lib/logger';
 *   logger.info({ userId }, 'User logged in');
 *   logger.error({ err }, 'Payment failed');
 */
import pino, { Logger } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger: Logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  redact: {
    paths: [
      'req.headers.authorization',
      'body.password',
      'body.password_hash',
      'body.card_number',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'nodbusiness-backend', env: process.env.NODE_ENV },
});

export default logger;
module.exports = logger;
