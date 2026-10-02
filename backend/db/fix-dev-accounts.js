/**
 * Compatibility entry point for the former credential-reset script.
 * The old script overwrote known passwords and could promote an existing user.
 * Refuse to do that; use create-admin.js for guarded, local-only account creation.
 */
console.error('Disabled: this command no longer resets passwords or changes account roles.');
console.error('For a fresh local database only, set ALLOW_DEV_ACCOUNT_BOOTSTRAP=1 and unique ADMIN_NEW_PASSWORD / TEST_ACCOUNT_PASSWORD values, then run node db/create-admin.js.');
process.exitCode = 1;
