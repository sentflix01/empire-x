/**
 * Database-backed tests: the same routes and migrations against a real
 * Postgres, without the mocked pool every other suite uses. The mocked pool
 * let wrong column names, a lost "$" placeholder, an untyped interval and a
 * migration that broke deploys all pass review in October 2026.
 *
 *   npm run test:db   (needs DATABASE_URL pointing at a local or CI database)
 */
const base = require('./package.json').jest;

module.exports = {
  ...base,
  // A regex rather than a glob so it matches on Windows paths too.
  testMatch: undefined,
  testRegex: String.raw`test[\\/]db[\\/].+\.db\.test\.[jt]s$`,
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/test/db/setup.js'],
  testTimeout: 120000,
};
