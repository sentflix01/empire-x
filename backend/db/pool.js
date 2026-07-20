const { Pool } = require('pg');
const logger = require('../lib/logger');

// Neon free tier allows max 20 connections total across all services.
// Keep pool small to avoid connection exhaustion — Railway + Neon free = max 5 per instance.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '5', 10),
  min: 1,
  idleTimeoutMillis: 60_000,     // keep connections alive longer to avoid reconnect overhead
  connectionTimeoutMillis: 8_000,
  allowExitOnIdle: false,         // keep pool warm between requests
});

pool.on('error', (err) => {
  logger.error({ err: err.message, component: 'db-pool' }, 'Unexpected PostgreSQL pool error');
});

module.exports = pool;
