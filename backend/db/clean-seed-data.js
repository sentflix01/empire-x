/**
 * Remove accounts explicitly marked is_seed=TRUE and rows that reference them.
 *
 * Safe by default: this command only reports the target database and count.
 * Destructive execution requires --execute, --database=<exact db name>,
 * ALLOW_SEED_CLEANUP=1, and a non-production NODE_ENV. It never truncates
 * tables and never deletes users that are not marked as seed data.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { databaseTarget, assertSafeTarget } = require('./operationSafety');

function parseArgs(args) {
  let execute = false;
  let databaseConfirmation;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--execute') execute = true;
    else if (arg.startsWith('--database=')) databaseConfirmation = arg.slice('--database='.length);
    else if (arg === '--database') databaseConfirmation = args[++index];
    else if (arg === '--help' || arg === '-h') return { help: true };
    else throw new Error(`Unknown option: ${arg}`);
  }
  return { execute, databaseConfirmation };
}

function validateExecution({ execute, target, databaseConfirmation, nodeEnv, allowCleanup }) {
  if (!execute) return;
  assertSafeTarget({
    target,
    nodeEnv,
    acknowledgement: allowCleanup,
    acknowledgementName: 'ALLOW_SEED_CLEANUP',
  });
  if (!databaseConfirmation || databaseConfirmation !== target.name) {
    throw new Error(`Pass --database=${target.name} to confirm the exact target database`);
  }
}

async function cleanupSeedUsers(dbPool, { execute }) {
  if (!execute) {
    const { rows } = await dbPool.query('SELECT COUNT(*)::int AS count FROM users WHERE is_seed = TRUE');
    return { dryRun: true, count: Number(rows[0]?.count ?? 0) };
  }

  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    // devops_items.created_by is the only users FK without an ON DELETE
    // action in the current migrations. It is nullable, so detach seed-owned
    // entries before the user delete; the rest are handled by declared FKs.
    await client.query(`
      UPDATE devops_items SET created_by = NULL
      WHERE created_by IN (SELECT id FROM users WHERE is_seed = TRUE)
    `);
    const { rows } = await client.query('DELETE FROM users WHERE is_seed = TRUE RETURNING id');
    await client.query('COMMIT');
    return { dryRun: false, count: rows.length };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function main(args = process.argv.slice(2), env = process.env) {
  const options = parseArgs(args);
  if (options.help) {
    console.log('Usage: npm run clean -- [--execute --database=<exact database name>]');
    console.log('Execution also requires ALLOW_SEED_CLEANUP=1 and NODE_ENV other than production.');
    return;
  }

  const target = databaseTarget(env.DATABASE_URL);
  validateExecution({
    ...options,
    target,
    nodeEnv: env.NODE_ENV,
    allowCleanup: env.ALLOW_SEED_CLEANUP,
  });

  // Report only non-secret connection identity. Never print credentials or
  // customer-owned row data from an operational cleanup command.
  console.log(`Seed cleanup target: ${target.host}:${target.port}/${target.name}`);
  const dbPool = require('./poolJsShim.cjs');
  try {
    const result = await cleanupSeedUsers(dbPool, options);
    if (result.dryRun) {
      console.log(`Dry run: ${result.count} seed account(s) are eligible. No data was changed.`);
      console.log(`To execute locally: set ALLOW_SEED_CLEANUP=1 and run with --execute --database=${target.name}`);
    } else {
      console.log(`Seed cleanup complete: deleted ${result.count} seed account(s) and their FK-cascaded rows.`);
    }
  } finally {
    await dbPool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Seed cleanup refused or failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, databaseTarget, validateExecution, cleanupSeedUsers, main };
