# backend/db/clean-seed-data.js

Safely removes accounts marked `is_seed = TRUE` and rows that the database schema cascades from those accounts. It never truncates content tables or deletes an account merely because of its email domain.

Dry-run (the default): `node db/clean-seed-data.js`

Destructive execution requires a non-production `NODE_ENV`, `ALLOW_SEED_CLEANUP=1`, and both `--execute` and `--database=<exact database name>`. The database name is printed with host and port, but credentials and customer row data are not printed. Before deletion the script nulls `devops_items.created_by` for seed accounts because that nullable FK has no delete action. Deletion is transactional; FK errors roll the transaction back.
