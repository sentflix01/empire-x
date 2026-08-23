# db/migrate-all.js - Migration Runner
`npm run migrate`. Auto-discovers migrate*.js files numerically, keeps schema_migrations tracking table (name/checksum/applied_at), skips already-applied, runs legacy scripts as subprocesses vs newer exported functions. Idempotent - safe on every deploy (deploy.yml runs it before services restart).
