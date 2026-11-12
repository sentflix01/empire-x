# 2026-11-12 — Flaky `devopsVersions.db.test.js` (401 instead of 403)

## Symptom

`test/db/devopsVersions.db.test.js` failed intermittently in CI with
`expected 403 "Forbidden", got 401 "Unauthorized"` on its second request (main
@ 5051b36, Actions run 42806800128; first run of PR sentflix01/empire-x#197). It
passed on re-run with no change.

## Evidence

The CI log, just before the failure:

```
WARN: auth: revocation check failed in Redis and Postgres; allowing request
  err: "sorry, too many clients already"
```

Postgres had run out of connections. The revocation check fails open; the user
lookup in `getCachedUser` then threw, and `requireAuth`'s catch-all turned that
into `401 INVALID_TOKEN`.

Ruled out: the `revoke_before` same-second comparison (strict `<`, so a token
issued in the revoke's second is accepted; user ids are UUIDs, so no suite can
revoke another's user), and `getCachedUser` caching a miss (the cache lives in
the suite's own module registry).

## Root cause

Jest gives each test file its own module registry, so every DB suite created new
`db/pool.ts` and `db/poolJsShim.cjs` pools (up to 5 connections each, 60 s idle
timeout) and none closed them. Under `--runInBand` the idle connections from
earlier suites piled up past `max_connections = 100`, so whichever late suite
needed a new connection first failed.

## Reproduction

Local stack (`.claude/skills/local-stack`), `npm run test:db` from `backend/`,
sampling `pg_stat_activity` client backends every second:

| Run | `max_connections` | Peak connections | Result |
|---|---|---|---|
| Before fix | 100 | 89 (climbing 3 → 89) | devopsVersions fails, 401 + "too many clients" |
| After fix | 100 | 5 (flat) | 38/38 suites pass |
| Before fix | 25 | — | many suites fail, 385 "too many clients" errors |
| After fix | 25 | — | 38/38 suites pass |

## Fix

- `backend/test/db/environment.js` (new test environment) and
  `backend/test/db/setup.js`: close the suite's pools on `run_finish`, after all
  of the suite's own `afterAll` hooks. A plain `afterAll` in the setup file runs
  *before* the suite's hooks and broke their cleanup queries.
- `backend/middleware/auth.ts`: non-JWT errors now return `503 AUTH_UNAVAILABLE`
  (see `project-brain/DECISIONS.md`, 2026-11-12).
