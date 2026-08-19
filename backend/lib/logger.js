/**
 * logger.js — Structured logging with Pino
 * 
 * Outputs JSON in production (for log aggregators like Datadog, Logtail).
 * Pretty-prints in development.
 * 
 * Usage:
 *   const logger = require('./lib/logger');
 *   logger.info({ userId }, 'User logged in');
 *   logger.error({ err }, 'Payment failed');
 */
const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
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
  // Redact sensitive fields from logs
  redact: {
    paths: ['req.headers.authorization', 'body.password', 'body.password_hash', 'body.card_number'],
    censor: '[REDACTED]',
  },
  base: { service: 'nodbusiness-backend', env: process.env.NODE_ENV },
});

module.exports = logger;
