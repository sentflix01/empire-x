/**
 * Compatibility entry point for seed cleanup. Deletion is restricted to users
 * explicitly marked is_seed=TRUE; emails and wallet balances are never used as
 * a proxy for whether an account is disposable.
 *
 * Defaults to a read-only count. Destructive execution requires the same
 * explicit local-database safeguards as clean-seed-data.js.
 */
require('./clean-seed-data').main().catch((error) => {
  console.error(`Seed cleanup refused or failed: ${error.message}`);
  process.exitCode = 1;
});
