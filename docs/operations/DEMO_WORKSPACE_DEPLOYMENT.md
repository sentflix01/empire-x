# Demo workspace deployment on the current Supabase project

This is the staged enablement procedure for using one physical Postgres database
with a `public` Real schema and a `demo` practice schema. **Do not enable
`DEMO_ENABLED` until all steps and permission checks pass.** The schemas share
the same project, backups, compute, outage scope, and administrative boundary.

## 1. Back up and provision restricted database roles

Take and verify a recoverable database backup first. In Supabase SQL Editor,
create two non-superuser login roles using unique passwords stored only in the
provider secret manager. Replace the placeholders before running:

```sql
CREATE ROLE real_app LOGIN PASSWORD '<unique-real-app-password>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE demo_app LOGIN PASSWORD '<unique-demo-app-password>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

CREATE SCHEMA demo AUTHORIZATION demo_app;
REVOKE ALL ON SCHEMA demo FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM demo_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM demo_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM demo_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

ALTER ROLE real_app SET search_path = public, pg_catalog;
ALTER ROLE demo_app SET search_path = demo, pg_catalog;

GRANT USAGE ON SCHEMA public TO real_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO real_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO real_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO real_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO real_app;
```

The Real and Demo runtime URLs must use these distinct usernames. For Supabase's
shared pooler, a custom role username includes the project reference, such as
`real_app.<project-ref>` and `demo_app.<project-ref>`. Keep migration/admin
credentials separate from Render's runtime credentials. Review existing default
privileges and extension/function grants for your project before applying this
template; it does not grant Demo any Real table privileges.

## 2. Configure the Demo schema and migrate

Set the runtime environment variables in Render only after provisioning:

```text
DATABASE_SCHEMA=public
DATABASE_URL=<real_app connection URL to this Supabase database>
DEMO_DB_SCHEMA=demo
DEMO_DATABASE_URL=<demo_app connection URL to this same Supabase database>
DEMO_ENABLED=false
DEMO_SESSION_SECRET=<unique random secret, at least 32 bytes, different from JWT_SECRET>
```

Use direct/session-mode migration URLs with the exact database name `postgres`.
The runtime Real credential is intentionally not a migration credential. In a
temporary, private shell, set `DATABASE_URL` to a privileged migration URL for
the same project (never save or commit it), and keep `DEMO_DATABASE_URL` set to
the restricted `demo_app` URL. The migration URL must select `public`; the Demo
URL must select `demo` and use the `demo_app` owner role. Apply the full chain
to `public` first, then to `demo`:

```powershell
cd backend
$env:DATABASE_URL = '<temporary privileged migration URL to postgres>'
$env:DATABASE_SCHEMA = 'public'
npm run migrate
$env:ALLOW_DEMO_MIGRATIONS = '1'
node db/migrate-demo.js --execute --database=postgres --schema=demo
```

The Demo migration uses the Demo schema's owner role via `DEMO_DATABASE_URL`.
The script requires the
exact database and schema acknowledgement and refuses shared database URLs with
the same login role or schema. Keep a record of migration output.

## 3. Seed and verify

Seed only the Demo fixtures after both migration chains succeed:

```powershell
$env:ALLOW_DEMO_SEED = '1'
node db/seed-demo.js --execute --database=postgres --schema=demo
```

The Demo seed command also uses `DEMO_DATABASE_URL`; do not run it with a
Real-schema URL. Clear the temporary privileged `DATABASE_URL` from the shell
after migrations, and do not copy it into Render's runtime environment.

## 4. Provision private Demo uploads

In the same Supabase project, create a second Storage bucket named, for example,
`demo-uploads`, with **Public bucket** turned off. Do not add anonymous read
policies. Keep the existing `SUPABASE_BUCKET` as the Real/public bucket, then
set `DEMO_SUPABASE_BUCKET=demo-uploads` in Render. The backend verifies that
the bucket exists, reports `public=false`, and differs from the Real bucket
before it will start with Demo enabled. Demo uploads go to this bucket and the
app stores time-limited signed URLs (up to seven days, matching a Demo session).
Treat those URLs as bearer links while they are valid. Demo uploads are not
supported on public R2 or without this private Supabase bucket.

Check `current_schema()` and the Demo role's grants using the same runtime
credentials. The backend startup check verifies that Real cannot read/write
Demo tables, Demo cannot read/write Real tables, neither role can create in the
other schema, neither role can execute another schema's `SECURITY DEFINER`
routine, neither role has role memberships, and neither role is a superuser.
It also checks foreign tables and sequences. Review cross-schema grants
inherited through `PUBLIC`; remove unsafe routine execution grants or adjust
the database design before enabling Demo. When Demo is enabled, startup also
checks the workspace-link migration and `demo_sessions` table before opening
the HTTP listener.

After the database and storage checks pass, change `DEMO_ENABLED=true` and
deploy. Smoke-test Real sign-in, switch to Demo and back, refresh while in each
workspace, logout, Demo publishing/expiry, and all payment routes (which must
reject Demo). Confirm anonymous requests cannot fetch Demo assets and that
signed URLs expire. Keep Demo disabled and roll back the deployment if any
check fails. Never run Demo cleanup against the Real schema.

## 5. Rollback

Disable Demo in Render first. Existing Real accounts and tables remain in
`public`; Demo shadow accounts are explicitly linked through
`users.workspace_owner_id`. Do not delete the Demo schema or unlink records as
part of application rollback. Restore from the verified backup only if the
migration changed Real data unexpectedly, and investigate before re-enabling.
