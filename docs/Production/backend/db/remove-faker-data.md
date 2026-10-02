# Seed data cleanup compatibility command

`remove-faker-data.js` now delegates to the guarded seed cleanup routine. By
default it reports how many users are explicitly marked `is_seed=TRUE` and
changes no data. To delete seed users, require a local development database,
`NODE_ENV` other than production, `ALLOW_SEED_CLEANUP=1`, `--execute`, and the
exact database name with `--database=<name>`. The operation is transactional
and relies on declared FK cascades, with explicit handling for the nullable
`devops_items.created_by` reference.

Email domains are no longer treated as proof that an account is disposable, and
wallet balances for non-seed users are never reset.
