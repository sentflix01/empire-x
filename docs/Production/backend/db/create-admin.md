# Local development account bootstrap

`create-admin.js` creates one local admin and one shared demo user on a fresh
development database. It requires `ALLOW_DEV_ACCOUNT_BOOTSTRAP=1` and explicit
`ADMIN_NEW_PASSWORD` and `TEST_ACCOUNT_PASSWORD` values, each 16–128 characters.
It rejects production and hosted database targets, checks both addresses are
unused before inserting, and rolls back on failure. The demo user is marked
`is_demo=true`; the admin is not. No passwords are printed.

This script is not a production account recovery tool. It refuses to update,
promote, or reset an existing account. For hosted environments, use the
provider's secure provisioning procedure.
