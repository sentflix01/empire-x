# Demo workspace deployment with a dedicated Supabase project

Use separate Supabase projects for Real and Demo. The production Real project
remains the source of Real accounts and content. The dedicated Demo project
stores only practice data and Demo uploads. Do not point both database URLs or
Storage credentials at the same Supabase project.

## 1. Configure local environment

Keep the existing Real `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_STORAGE_KEY`,
and `SUPABASE_BUCKET` values unchanged. In `backend/.env`, add:

```text
DEMO_ENABLED=true
DEMO_DATABASE_URL=<Postgres connection string for the dedicated Demo project>
DEMO_DB_SCHEMA=public
DEMO_SESSION_SECRET=<unique random secret of at least 32 bytes>
DEMO_SUPABASE_URL=<https://project-ref.supabase.co for the Demo project>
DEMO_SUPABASE_STORAGE_KEY=<server-only secret key for the Demo project>
DEMO_SUPABASE_BUCKET=demo-uploads
```

Use the Demo project's Postgres URI, not its Supabase project URL or an API
key, for `DEMO_DATABASE_URL`. The Postgres database name is commonly `postgres`;
use the actual name at the end of the connection URI in migration commands.
Keep all connection strings and secret keys private. The Demo session secret
must differ from `JWT_SECRET`.

For a persistent Render backend, choose the Supabase **Session pooler** URI
(port `5432`) when using the IPv4 pooler, or Direct connection if the host can
reach the project's IPv6 endpoint. For migrations, Direct connection is
preferred; Session pooler is the alternative when Direct is unreachable. Do
not use the Transaction pooler URI (port `6543`) for this persistent backend
or migration run.

The Demo Storage bucket must already exist in the Demo project and have public
access disabled. The backend checks that the Demo Storage project differs from
the Real project and that the bucket is private before enabling Demo.

## 2. Migrate the dedicated Demo database

From the repository root in PowerShell:

```powershell
$env:ALLOW_DEMO_MIGRATIONS = '1'
npm --prefix backend run migrate:demo -- --execute --database=postgres
```

Or, if already in `backend`:

```powershell
$env:ALLOW_DEMO_MIGRATIONS = '1'
npm run migrate:demo -- --execute --database=postgres
```

Replace `postgres` if the database name in `DEMO_DATABASE_URL` differs. The
script requires both Real and Demo URLs so it can verify that the migration
target is not the Real database. Review the migration output before continuing.

## 3. Seed sample Demo businesses

After migrations succeed, seed only the dedicated Demo database:

```powershell
$env:ALLOW_DEMO_SEED = '1'
npm --prefix backend run seed:demo -- --execute --database=postgres
```

Use `npm run seed:demo -- --execute --database=postgres` instead when already
inside `backend`. Never point this seed command at the Real database.

## 4. Configure Render after the code is merged

In the backend Render service, keep all existing Real variables unchanged and
add these Demo variables using the same values described above:

```text
DEMO_ENABLED=true
DEMO_DATABASE_URL=<dedicated Demo project's Postgres connection string>
DEMO_DB_SCHEMA=public
DEMO_SESSION_SECRET=<new unique secret, at least 32 bytes>
DEMO_SUPABASE_URL=<Demo project's Supabase URL>
DEMO_SUPABASE_STORAGE_KEY=<Demo project's server-only secret API key>
DEMO_SUPABASE_BUCKET=demo-uploads
```

Deploy only after the Demo migrations have completed and the private bucket is
available. Check Render startup logs for successful database and Storage
isolation checks. Then verify Try Demo, Demo uploads, and Real sign-in from a
fresh browser. Demo users and assets must not appear in the Real workspace.
