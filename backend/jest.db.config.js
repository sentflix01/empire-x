/**
 * Database-backed tests: the same routes and migrations against a real
 * Postgres, without the mocked pool every other suite uses. The mocked pool
 * let wrong column names, a lost "$" placeholder, an untyped interval and a
 * migration that broke deploys all pass review in October 2026.
 *
 *   npm run test:db   (needs DATABASE_URL pointing at a local or CI database)
 *
 * Each suite gets its own Postgres pools; test/db/environment.js closes them
 * after the suite's hooks, so suites need not close pools themselves.
 */
const base = require('./package.json').jest;

module.exports = {
  ...base,
  // A regex rather than a glob so it matches on Windows paths too.
  testMatch: undefined,
  testRegex: String.raw`test[\\/]db[\\/].+\.db\.test\.[jt]s$`,
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/test/db/setup.js'],
  // Closes each suite's Postgres pools after its hooks (see the file).
  testEnvironment: '<rootDir>/test/db/environment.js',
  testTimeout: 120000,
};
