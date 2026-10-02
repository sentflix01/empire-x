# backend/db/cleanup-seed-data.js

Backward-compatible entry point for the safe seed cleanup in `clean-seed-data.js`.
It does not truncate tables or delete real accounts. Dry-run is the default.

## Destructive execution

Execution requires all of the following:

1. `NODE_ENV` is not `production`.
2. `ALLOW_SEED_CLEANUP=1` is explicitly set.
3. The command includes `--execute` and `--database=<exact database name>`.

The cleanup runs a single transaction deleting only `users.is_seed = TRUE`; database foreign-key actions clean up dependent rows. It first sets `devops_items.created_by` to NULL for seed accounts because that nullable FK has no delete action. A constraint failure rolls the transaction back.
