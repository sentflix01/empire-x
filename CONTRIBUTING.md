# Contributing to Nodbusiness

First: thank you. This project moves fast, and these rules exist so it can keep doing so
without breaking people's shops, chats, or wallets.

## The 60-second version

1. Branch from `main` using `feat/`, `fix/`, `chore/`, `refactor/`, or `docs/` prefixes.
2. Conventional Commits for every commit (`feat(wallet): …`).
3. Before opening a PR: backend `npx jest --runInBand` green, frontend `npm run lint` +
   `npx tsc --noEmit` + `npm run build` green.
4. Small PRs. One concern each. Explain *why* in the description.
5. Never commit secrets. `.env` stays local; use `.env.example` placeholders.

Full engineering standards (naming, API patterns, security rules, testing bar):
[`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md)

## Where things live

| Path | What |
|---|---|
| `backend/` | Express + TypeScript API (run: `npm run dev`) |
| `frontend-next/` | Next.js 16 App Router client (run: `npm run dev`) |
| `docs/` | The knowledge base — **if you change behavior, change its doc in the same PR** |
| `backend/db/migrate*.js` | Numbered, idempotent SQL migrations (tracked in `schema_migrations`) |

## Rules that get PRs returned

- Money paths (`orders.ts`, `wallet.ts`, `commission.ts`) require an owning-reviewer and a test.
- No raw string-interpolated SQL — parameterize everything; column names via `sanitizeColumn`.
- New features ship behind a flag registered in `backend/lib/featureFlags.ts`
  **and documented in `docs/product/FEATURE_FLAGS.md`** (same PR).
- Every endpoint: auth check → input validation → ownership check → consistent error shape.
- Docs that describe code must not drift: if your PR changes an API, flag default, payment
  flow, or operational procedure, update the corresponding page under `docs/`.

## Reporting bugs & security issues

- Bugs: open a GitHub issue with repro steps and logs. Anything user-impacting also belongs in
  the internal error feed (`/admin/devops`).
- **Security vulnerabilities: do NOT open a public issue.** Follow
  [`SECURITY.md`](SECURITY.md) for responsible disclosure.

## Community

Be decent. Harassment, spam, and bad-faith reports are handled per
`docs/trust-safety/COMMUNITY_STANDARDS.md`.
