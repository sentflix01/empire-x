'use strict';

/**
 * Test environment for database-backed suites. Jest gives every suite its own
 * module registry, so each suite opens its own Postgres pools (db/pool.ts and
 * db/poolJsShim.cjs). Left open, they piled up past Postgres's client limit
 * during `npm run test:db` and later suites failed with "too many clients
 * already" (seen in CI as a 401 from requireAuth).
 *
 * teardown() runs after every hook in the suite, including the suite's own
 * afterAll cleanup, so the pools are closed only once nothing needs them.
 * test/db/setup.js registers the closer as a global for this to call.
 */
const { TestEnvironment } = require('jest-environment-node');

class DbTestEnvironment extends TestEnvironment {
  async teardown() {
    const close = this.global.__closeDbTestPools;
    if (typeof close === 'function') await close();
    await super.teardown();
  }
}

module.exports = DbTestEnvironment;
