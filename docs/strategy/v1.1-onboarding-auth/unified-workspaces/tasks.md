# Unified identity and workspaces — implementation tasks

## Database and deployment foundation

- [ ] Provision restricted Real and Demo database roles and schemas. For the
  current single-database setup, use `public` for Real and `demo` for Demo.
- [ ] Apply the complete migration chain independently to both schemas and
  verify `current_schema()` and table ownership before enabling Demo traffic.
- [x] Update migration, seed, cleanup, backup, and E2E scripts to require an
  exact database and schema acknowledgement for shared-database operations.
- [x] Add an explicit data backup and rollback procedure for the transition.

## Identity and workspace context

- [x] Add `workspace_owner_id` migration metadata and create a linked Demo
  shadow identity without copying credentials or merging by email.
- [x] Implement an authenticated workspace-switch endpoint using verified
  session state and signed Demo session cookies.
- [x] Route landing, login, and registration to one canonical Real login; reject
  direct client requests to authenticate as a separate Demo account.
- [x] Reject conflicting/unmapped legacy Demo rows and preserve their data.

## Enforcement

- [ ] Scope every read/write route, background job, WebSocket event, public
  showroom path, storage object, and cache key by active workspace.
- [ ] Make every Demo write path safe; payment and withdrawal routes now reject
  Demo workspace sessions, while other external effects still require audit.
- [x] Separate Demo uploads from the public Real bucket: verify a dedicated
  private Supabase bucket at startup, issue temporary signed links, and reject
  Demo uploads on public R2. Provisioning that bucket remains an operator step.
- [ ] Keep Demo expiry/reset behavior separate from Real data and ensure cleanup
  jobs cannot reach the Real schema or uploads.
- [ ] Keep public guest access read-only and Real-only.

## User experience

- [x] Remove account-mode selection from landing, login, registration, Google
  auth entry points, and authenticated redirects.
- [x] Add a clear Real/Demo workspace switcher and active-workspace label;
  switching clears the client query cache.
- [x] Route the landing page's primary action directly to registration and keep
  guest Explore as a separate read-only path.
- [ ] Offer a clearly labeled Demo preview and read-only public Explore entry on
  the landing page.
- [ ] Do not mix Demo and Real feed/search records in the same result set.

## Verification and release

- [ ] Add allow/deny tests for workspace crossover, forged mode headers, stale
  cookies/tokens, cache variation, file access, and external side effects.
- [x] Add focused auth, migration-target, shared-pool, Demo-payment, and public
  showroom expiry tests. Fresh-browser mocked auth/OAuth and guest navigation
  smoke tests pass; provider-backed Google and configured Demo-database tests
  still require deployment credentials.
- [ ] Verify account mapping, schema permissions, migration reruns, seed safety,
  cleanup safety, and rollback against staging data.
- [ ] Run backend/frontend type checks, lint, unit/integration tests, builds, and
  fresh-browser auth/OAuth smoke tests before enabling the feature flag.
- [ ] Enable unified workspaces only after the migration and all checks pass.
