# backend/db/migrate-demo

## 1. What is this?

**Database operations script.** Runs the ordered schema migrations against the explicitly configured demo PostgreSQL target.

## 2. Why does it exist?

Track 2 must never apply migrations to the real database by mistake. The script requires both real and demo URLs for comparison and requires an operator opt-in plus the exact decoded database name before spawning the migration runner.

## 3. What does it do?

- Requires `DATABASE_URL` and `DEMO_DATABASE_URL`.
- Refuses a demo target with the same normalized host, port, and database path as the real target.
- Requires `ALLOW_DEMO_MIGRATIONS=1`, `--execute`, and `--database=<exact demo database name>`.
- Passes the demo URL and demo TLS overrides to the child migration runner.
- Prints only the normalized host, port, and database name; it does not print credentials.
- Do not execute this script against production data during local verification.

## 4. What does it touch?

**Source:** `backend/db/migrate-demo.js`
