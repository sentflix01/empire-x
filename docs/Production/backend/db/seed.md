# Local development seed

`seed.js` creates sample users, businesses, posts, and related demo content for
local development. It no longer installs fixed account passwords, prints
credentials, or overwrites pre-existing admin/demo account passwords, roles,
demo status, or wallets.

## Guarded usage

Run this only against a disposable local database. From `backend/`, configure
the database URL and set `ALLOW_DEV_SEED=1`, `ADMIN_NEW_PASSWORD`, and
`TEST_ACCOUNT_PASSWORD` in the shell or a local secret store. Both passwords
must be unique and 16–128 characters. Then run `node db/seed.js`. The command
refuses production and non-local database hosts and aborts if either built-in
account already exists. It wraps its writes in a transaction and does not
connect to a database until its environment checks pass.

The generated seed-user password is `TEST_ACCOUNT_PASSWORD`; the script never
prints its value. Follow-on seed scripts also require `ALLOW_DEV_SEED=1` and
the same local-database restrictions.
