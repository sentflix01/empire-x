const { spawnSync } = require('node:child_process');
const { URL } = require('node:url');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });

function databaseIdentity(connectionString) {
  const target = new URL(connectionString);
  return `${target.hostname.replace(/^\[|\]$/g, '').toLowerCase()}:${target.port || '5432'}/${decodeURIComponent(target.pathname.replace(/^\//, ''))}`;
}

function databaseName(connectionString) {
  const target = new URL(connectionString);
  return decodeURIComponent(target.pathname.replace(/^\//, ''));
}

function databaseRole(connectionString) {
  return decodeURIComponent(new URL(connectionString).username);
}

const realUrl = process.env.DATABASE_URL;
const demoUrl = process.env.DEMO_DATABASE_URL;
if (!demoUrl) {
  console.error('Refusing to migrate demo DB: set DEMO_DATABASE_URL explicitly.');
  process.exit(1);
}
if (!realUrl) {
  console.error('Refusing to migrate demo DB: DATABASE_URL must also be set to compare targets.');
  process.exit(1);
}
const sharedDatabase = databaseIdentity(demoUrl) === databaseIdentity(realUrl);
const demoSchema = process.env.DEMO_DB_SCHEMA || (sharedDatabase ? '' : 'public');
const realSchema = process.env.DATABASE_SCHEMA || 'public';
if (sharedDatabase && (!demoSchema || demoSchema === realSchema || databaseRole(demoUrl) === databaseRole(realUrl))) {
  console.error('Refusing shared-database Demo migrations: configure different schemas and different restricted database roles.');
  process.exit(1);
}

const targetArgument = process.argv.find((argument) => argument.startsWith('--database='))?.slice('--database='.length);
const schemaArgument = process.argv.find((argument) => argument.startsWith('--schema='))?.slice('--schema='.length);
if (process.env.ALLOW_DEMO_MIGRATIONS !== '1' || !process.argv.includes('--execute') || targetArgument !== databaseName(demoUrl) || (sharedDatabase && schemaArgument !== demoSchema)) {
  console.error(`Refusing demo migrations: set ALLOW_DEMO_MIGRATIONS=1 and pass --execute --database=<exact demo database name>${sharedDatabase ? ' --schema=<exact demo schema>' : ''}.`);
  process.exit(1);
}

console.log(`Running migrations against the configured demo database: ${databaseIdentity(demoUrl)}`);
const migrationEnv = { ...process.env, DATABASE_URL: demoUrl, DATABASE_SCHEMA: demoSchema };
if (process.env.DEMO_DATABASE_URL_REQUIRE_TLS !== undefined) {
  migrationEnv.DATABASE_URL_REQUIRE_TLS = process.env.DEMO_DATABASE_URL_REQUIRE_TLS;
}
if (process.env.DEMO_DB_SSL_CA_FILE !== undefined) migrationEnv.DB_SSL_CA_FILE = process.env.DEMO_DB_SSL_CA_FILE;
const result = spawnSync(process.execPath, [require('node:path').join(__dirname, 'migrate-all.js')], {
  stdio: 'inherit',
  env: migrationEnv,
});
if (result.error) {
  console.error(`Could not start demo migration runner: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
