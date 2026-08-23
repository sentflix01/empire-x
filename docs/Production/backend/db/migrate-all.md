# db/migrate-all.js - Migration Runner

## 1. What is this?

**Database layer module.** `npm run migrate`.

## 2. Why does it exist?

`npm run migrate`. Auto-discovers migrate*.js files numerically, keeps schema_migrations tracking table (name/checksum/applied_at), skips already-applied, runs legacy scripts as subprocesses vs newer exported functions. Idempotent - safe on every deploy (deploy.yml runs it before services restart).

## 3. What does it do?

`npm run migrate`. Auto-discovers migrate*.js files numerically, keeps schema_migrations tracking table (name/checksum/applied_at), skips already-applied, runs legacy scripts as subprocesses vs newer exported functions. Idempotent - safe on every deploy (deploy.yml runs it before services restart).

## 4. What does it touch?

Inline references only — nothing external.
