'use strict';

/**
 * Safety guard for database-backed tests: they write and delete rows, so they
 * only ever run against a database on this machine or the CI service
 * container, never a hosted one.
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error('test:db needs DATABASE_URL (a local or CI Postgres).');
const host = new URL(url).hostname;
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
  throw new Error(`test:db refuses to run against ${host}; use a local or CI database.`);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'db-test-secret-do-not-use-in-production-0123456789';
process.env.NODE_ENV = 'test';
delete process.env.DEMO_DATABASE_URL;
delete process.env.REDIS_URL;
