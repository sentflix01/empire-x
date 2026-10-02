# Development seed environment safety tests

`seedEnvironmentSafety.test.ts` checks the data-seeding command's preflight:
only a non-production local database is accepted, `ALLOW_DEV_SEED=1` is
required, and the admin/demo credentials must be unique strong values supplied
by the operator. These tests do not connect to Postgres or change data.

Run from `backend/` with `node_modules/.bin/jest --runInBand
__tests__/seedEnvironmentSafety.test.ts`.
