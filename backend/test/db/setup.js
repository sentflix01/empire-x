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

// Jest gives every test file its own module registry, so each suite builds its
// own pools (db/pool.ts and db/poolJsShim.cjs, up to 5 connections each, 60 s
// idle timeout). Left open, they pile up across suites under --runInBand until
// Postgres refuses new clients ("too many clients already") and a late suite
// fails at random. test/db/environment.js calls this once the suite's own
// afterAll hooks have run; an afterAll here would run before them.
//
// By then Jest only resolves modules the suite already loaded; a pool module it
// never loaded has no connections, so a refused require means nothing to close.
function loadedModule(path) {
  try { return require(path); } catch { return null; }
}
globalThis.__closeDbTestPools = async () => {
  const pool = loadedModule('../../db/pool');
  const shim = loadedModule('../../db/poolJsShim.cjs');
  await Promise.allSettled([
    pool ? pool.closeAllPools() : null,
    shim && !shim.ended ? shim.end() : null,
  ]);
};
