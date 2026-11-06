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
  // Defence in depth: these keys are removed wherever a log call passes them.
  // URLs are redacted before logging with lib/redact.ts (audit F-015).
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'res.headers["set-cookie"]',
      'body.password',
      'body.password_hash',
      'body.card_number',
      '*.password',
      '*.token',
      '*.access_token',
      '*.refresh_token',
      '*.otp',
      '*.otpCode',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'nodbusiness-backend', env: process.env.NODE_ENV },
});

export default logger;
module.exports = logger;
