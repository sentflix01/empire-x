# scripts/verify-backup.js - Backup Restorability Proof
Drops/recreates scratch schema from BACKUP_VERIFY_DATABASE_URL, pg_restores newest dump, asserts table+user counts. Exit 0 = proven restorable. NEVER point at production (refuses prod-looking URLs). Weekly: npm run backup:verify.
