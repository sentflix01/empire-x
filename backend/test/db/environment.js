'use strict';

/**
 * Test environment for database-backed suites. After every hook in a suite has
 * run, it closes that suite's Postgres pools (see test/db/setup.js), so
 * connections do not accumulate across suites under --runInBand.
 */
const { TestEnvironment } = require('jest-environment-node');

class DbTestEnvironment extends TestEnvironment {
  async handleTestEvent(event) {
    if (event.name === 'run_finish' && typeof this.global.__closeDbTestPools === 'function') {
      await this.global.__closeDbTestPools();
    }
  }
}

module.exports = DbTestEnvironment;
