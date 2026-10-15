# Project Decisions and Open Questions

This is the concise, cross-cutting decision log for decisions that affect how
work is carried out. Feature-specific technical rationale may remain in
`docs/architecture/ADR.md` or the relevant product specification.

## Confirmed working agreements

These are captured from the repository's current contributor documentation.
They remain subject to an explicit maintainer decision if that documentation
is amended.

| Decision | Source / rationale |
|---|---|
| Work in the existing monorepo, with frontend and backend concerns kept in their respective packages. | Repository structure and `CONTRIBUTING.md`; avoids mixing UI and server responsibilities. |
| Use focused branches with the documented `feat/`, `fix/`, `chore/`, `refactor/`, or `docs/` prefixes. | `CONTRIBUTING.md`; makes change intent visible. |
| Use Conventional Commit messages. | `CONTRIBUTING.md`; keeps change history consistent. |
| Parameterize SQL and apply backend validation, authentication, and resource-ownership checks to protected API behavior. | `CONTRIBUTING.md` and `docs/ENGINEERING_STANDARDS.md`; protects data and prevents injection/unauthorized access. |
| Register and document new feature flags in the existing backend flag system. | `CONTRIBUTING.md` and `docs/product/FEATURE_FLAGS.md`; keeps rollout behavior reviewable. |
| Update maintained documentation when a change affects documented behavior. | `CONTRIBUTING.md`; prevents API, product, and operational guidance from drifting. |
| Keep secrets and local environment files out of Git; use example templates for setup guidance. | `CONTRIBUTING.md`, `.gitignore`, and `SECURITY.md`; protects credentials. |
| Prefer focused tests and package-specific checks; run the broader contributor gates before a pull request. | `CONTRIBUTING.md` and package scripts; balances fast feedback with release confidence. |

## Conflicts requiring verification

These are observations, not decisions. Resolve them in the owning source
documents when verified; do not copy stale values into new work.

| Topic | Conflicting evidence | Required action |
|---|---|---|
| Backend Express version | Root `README.md` describes Express 4; `backend/package.json` currently declares Express 5. | Treat the package manifest as the installed dependency declaration; update the overview after maintainers verify compatibility and deployment state. |
| Frontend hosting | `frontend-next/README.md` mentions Cloudflare Pages, while root project docs describe Vercel. | Verify the active deployment target and update deployment docs before changing deployment configuration. |
| Local developer setup | `docs/ONBOARDING.md` and root `README.md` have differing and partially duplicated setup instructions. | Confirm the supported local database/env path, then consolidate the docs without changing credentials or live resources. |

## Open decisions

- Confirm and document one canonical local setup path (database, env templates,
  package installation, migration workflow, and startup commands).
- Confirm the active frontend hosting target and make all deployment guidance
  consistent with the live project.
- Decide whether the engineering handbook's broad statements (for example,
  mandatory feature flags or endpoint versioning) are universal requirements
  or recommendations, then align them with actual practice.

## Accepted feature decisions

### 2026-10-15 — Demo storefronts showcase supported flows without simulating external integrations

- **Status:** Accepted
- **Decision owner:** Project owner
- **Context:** The Demo should demonstrate different business models, while the
  current platform does not provide live ride dispatch, telecom provisioning,
  government transactions, or confirmed third-party appointment reservations.
- **Decision:** Seed clearly fictional business-specific storefronts with
  5–10 relevant catalog or service listings. Use the existing order flow for
  listed products and the authenticated inquiry flow for service and booking
  requests. Label requests as inquiries, not confirmations, and disclose where
  a showcase is not an official or integrated service.
- **Rationale:** The examples should be interactive without misleading buyers
  about fulfillment or pretending an external provider is connected.
- **Consequences:** Demo can exercise product discovery, checkout, and
  business-owner inquiry workflows. Live dispatch, provider activation, official
  government submissions, and guaranteed reservations remain out of scope
  until their real backend integrations exist. Keep both personal and business
  identity fields in the existing single profile row; do not create duplicate
  profile rows for the Demo owner.
- **Related documentation:** [Demo workspace deployment](../docs/operations/DEMO_WORKSPACE_DEPLOYMENT.md)

## Adding a decision

For each durable decision, include a date, status, decision owner (only when
known), context, chosen option, rationale, and consequences. Link the affected
ADR/spec/runbook. Do not turn an assumption into a decision; keep unresolved
items in the open list until confirmed.
