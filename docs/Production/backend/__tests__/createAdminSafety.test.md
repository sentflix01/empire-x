# Local development account bootstrap safety tests

`createAdminSafety.test.ts` verifies the account bootstrap refuses hosted or
production databases, requires explicit local confirmation and strong unique
passwords before opening a connection, creates only absent accounts, marks the
demo identity as demo, and rolls back rather than overwriting an existing user.

Run from `backend/` with `node_modules/.bin/jest --runInBand
__tests__/createAdminSafety.test.ts`.
