# db/migrate-all.js - Migration Runner

## 1. What is this?

**Database layer module.** `npm run migrate`.

## 2. Why does it exist?

`npm run migrate`. Auto-discovers migrate*.js files numerically, keeps the migration_ledger ledger (name, checksum, runner, duration_ms, runs, applied_at; added 6 Nov 2026, audit F-009), skips recorded migrations, stops when a recorded file changed (use --rerun <file>), waits on a database lock so two runs never overlap, runs legacy scripts as subprocesses and exported functions in-process. `--status` reports applied/pending/changed; `--all` re-runs everything (idempotency check). deploy.yml runs it before services restart.

## 3. What does it do?

`npm run migrate`. Auto-discovers migrate*.js files numerically, keeps the migration_ledger ledger (name, checksum, runner, duration_ms, runs, applied_at; added 6 Nov 2026, audit F-009), skips recorded migrations, stops when a recorded file changed (use --rerun <file>), waits on a database lock so two runs never overlap, runs legacy scripts as subprocesses and exported functions in-process. `--status` reports applied/pending/changed; `--all` re-runs everything (idempotency check). deploy.yml runs it before services restart.

## 4. What does it touch?

Inline references only — nothing external.
