# Repository Working Guide

Before starting a task, read [project-brain/README.md](project-brain/README.md),
then the source documents it points to for that task. Read the relevant code
and tests before changing behavior.

## Working rules

- Treat this as a monorepo: `backend/` owns the API and persistence;
  `frontend-next/` owns the Next.js application; `docs/` is the engineering
  handbook; `project-brain/` is its navigation and governance layer.
- Follow [CONTRIBUTING.md](CONTRIBUTING.md) and
  [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md). Prefer a
  focused branch and change, and do not overwrite or revert unrelated work.
- Keep validation, authentication, authorization, persistence, and business
  rules on the backend. Keep presentation and interaction concerns on the
  frontend. Follow existing typed contracts and validation patterns.
- For behavior changes, update directly related docs and tests in the same
  change. Record durable architecture or product decisions in
  `project-brain/DECISIONS.md`; put temporary investigation notes in
  `note/` and link them from the task or pull request.
- Never add secrets, live credentials, personal data, or production data to
  Git or project documentation. Use the repository's environment templates.
- When authoritative sources conflict or a task requires an unspecified
  product/security decision, stop and surface the conflict instead of
  silently choosing.

## Validation

Run checks from the package that owns the change. Use the smallest relevant
test first; run the broader gates required by
[CONTRIBUTING.md](CONTRIBUTING.md) before proposing a pull request.

- Frontend: `npm run lint`, `npx tsc --noEmit --pretty false`,
  `npm test` (or the relevant Vitest test), and `npm run build`
  followed by `npm run check:css` as applicable, from `frontend-next/`.
- Backend: `npm run typecheck`, focused Jest tests, `npm run test:db`
  against a local Postgres for SQL or migration changes, and the required
  integration/e2e checks as applicable, from `backend/`.
- Database changes: verify migration ordering, idempotency, and rollback or
  compatibility expectations using the existing migration conventions.

The generated Next.js rules in `frontend-next/AGENTS.md` also apply to
frontend work. Read the installed Next.js documentation they require before
editing Next.js code.
