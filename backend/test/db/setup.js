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

// Jest gives every test file a fresh module registry, so each file opens its
// own pools (the shim the helpers use, and db/pool.ts behind the routes) and
// never closes them. With the default 60 s idle timeout their connections
// stayed open and the run climbed to Postgres's default limit of 100; late
// files then failed with "sorry, too many clients already" (seen locally).
// A short idle timeout lets a finished file's connections close almost at once.
process.env.DB_IDLE_TIMEOUT_MS = '200';
