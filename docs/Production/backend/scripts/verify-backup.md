# scripts/verify-backup.js - Backup Restorability Proof

## 1. What is this?

**Operational script.** Drops/recreates scratch schema from BACKUP_VERIFY_DATABASE_URL, pg_restores newest dump, asserts table+user counts.

## 2. Why does it exist?

Drops/recreates scratch schema from BACKUP_VERIFY_DATABASE_URL, pg_restores newest dump, asserts table+user counts. Exit 0 = proven restorable. NEVER point at production (refuses prod-looking URLs). Weekly: npm run backup:verify.

## 3. What does it do?

Drops/recreates scratch schema from BACKUP_VERIFY_DATABASE_URL, pg_restores newest dump, asserts table+user counts. Exit 0 = proven restorable. NEVER point at production (refuses prod-looking URLs). Weekly: npm run backup:verify.

## 4. What does it touch?

Inline references only — nothing external.
