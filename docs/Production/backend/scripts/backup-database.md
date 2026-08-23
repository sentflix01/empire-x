# scripts/backup-database.js - Automated DB Backups (TD-020)

## 1. What is this?

**Operational script.** Daily pg_dump (custom format, gzipped) scheduled in-process (hourly check, at-most-daily).

## 2. Why does it exist?

Daily pg_dump (custom format, gzipped) scheduled in-process (hourly check, at-most-daily). Uploads to Cloudflare R2 when configured, else local backend/backups/ (warns: not durable). BACKUP_RETENTION_DAYS pruning (14). Outcome telemetry into app_settings key last_database_backup so monitoring alerts on stale/failed. Manual: npm run backup. Needs postgresql-client on PATH.

## 3. What does it do?

Daily pg_dump (custom format, gzipped) scheduled in-process (hourly check, at-most-daily). Uploads to Cloudflare R2 when configured, else local backend/backups/ (warns: not durable). BACKUP_RETENTION_DAYS pruning (14). Outcome telemetry into app_settings key last_database_backup so monitoring alerts on stale/failed. Manual: npm run backup. Needs postgresql-client on PATH.

## 4. What does it touch?

Inline references only — nothing external.
