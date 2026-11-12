-- Re-audit 2026-11-11: remove the local test data the re-audit created. LOCAL DATABASE ONLY.
--   psql "$DATABASE_URL" -f note/2026-11-05-international-audit/scripts/reaudit-cleanup.sql
DELETE FROM products   WHERE length(title) > 5000 OR length(coalesce(description, '')) > 50000;
DELETE FROM comments   WHERE length(content) > 50000;
DELETE FROM posts      WHERE length(content) > 50000;
DELETE FROM businesses WHERE length(business_name) > 1000;
