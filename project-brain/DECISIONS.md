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

### 2026-10-16 — NodBusiness never holds customer funds; revenue is subscriptions only

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** The platform charged a 3% commission and kept a user wallet,
  both of which require holding customer money.
- **Decision:** Remove the platform commission and the money-holding wallet.
  Sellers are paid directly, by external payment or by an integrated provider
  that settles to the seller's own account. Creator partnership commissions
  are recorded and reported only; the parties settle directly.
- **Consequences:** Checkout must never charge into a platform-owned account.
  Real wallet balances must be paid out or zeroed before the wallet is switched off.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §1

### 2026-10-16 — Guest checkout, external-payment confirmation and address privacy

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Decision:** Guests buy without an account using phone and email and a
  private order link; notifications go by email first and SMS later. For
  external payments the buyer reports payment (receipt optional, stored
  privately) and only the seller confirms; unconfirmed orders expire after 7
  days. Only business contact details are public by default, per-field
  visibility is owner-controlled and server-enforced, and the pickup address
  shows only after an order.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §2

### 2026-10-16 — ETB subscription plans and owner access until deletion

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Decision:** Plans are Normal ETB 100, Premium ETB 500, Pro ETB 1,000 and
  Enterprise custom per month, replacing the `$12 / $49` table shipped in PR
  #104. USD equivalents are kept only for billing businesses outside Ethiopia.
  After expiry the owner keeps full access (view, edit, renew) to the hidden
  business until the Day-10 deletion, replacing the implemented Day-3 owner
  lockout.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §3, §6

### 2026-10-16 — Guests browse Real content read-only; Demo only through Try Demo

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Decision:** Visitors without an account browse Real businesses, products,
  services and feeds read-only and never connect to Demo data. A business QR
  code or link opens only that business's public page, with Back to Landing
  and Try Demo buttons. Real published businesses stay findable by search
  engines. Demo/Real separation is audited across reads, writes, profiles,
  feeds, search, showroom pages and cache keys; Demo payments never reach real
  providers. This replaces "Explore as guest shows Demo content only".
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §7

### 2026-10-16 — Demo businesses simulate their core flows, built through the builder

- **Status:** Accepted. **Supersedes** the 2026-10-15 decision below.
- **Decision owner:** Project owner (@Sent)
- **Decision:** Demo businesses (ride service, telecom, booking, supermarket,
  pharmacy, government) simulate their core flows, clearly labelled as Demo,
  with 5–10 or more working products or services each. Every template and demo
  site is built through the real Build/template → customize → publish
  pathway. A research step decides the best presentation for each business
  type before building. The ride-service route line is simulated.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §8

### 2026-10-15 — Demo storefronts showcase supported flows without simulating external integrations

- **Status:** Superseded on 2026-10-16 by "Demo businesses simulate their core flows, built through the builder" above.
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

### 2026-10-16 — Owners choose public or private; guests see the business feed only

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** Every business site was open to anyone, and guests could read
  personal posts and profiles.
- **Decision:** Each business is **Public** (default) or **Private**. Private
  businesses, their sites and products are for signed-in users only and are
  hidden from guests, the sitemap and search engines. Guests see the business
  feed only; personal posts, stories, people and personal profiles need
  sign-in. This narrows "open without signing in" and "findable by search
  engines" to public businesses.
- **Consequences:** Guest-facing reads go through `lib/siteVisibility.ts`;
  a guest request for private or personal content gets `401 SIGN_IN_REQUIRED`
  and the page shows "Sign in to view". Response caches split guests from
  members.
- **Related documentation:** [Platform model decisions](../docs/decisions/platform-model-decisions.md) §2, §7.1, §7.3, §7.5

### 2026-10-16 — globals.css is the only Tailwind configuration; CI fails on missing utilities

- **Status:** Accepted
- **Decision owner:** Project owner (@Sent)
- **Context:** The Next.js 16 move (2026-07-07) upgraded to Tailwind v4 but kept
  the v3 `tailwind.config.js`, which v4 never loads. Theme colours, enter/exit
  animations and the custom radius were silently missing in production for
  three months (151 utilities).
- **Decision:** `frontend-next/app/globals.css` is the single source of theme
  tokens (`@theme`) and Tailwind plugins (`@plugin`). There is no
  `tailwind.config.js`. `npm run check:css` runs after every CI build and fails
  when the source uses a theme or plugin utility the build did not generate.
- **Consequences:** New tokens, including ones a shadcn component needs, are
  added to `@theme` in the same change. The checker's allowlist is only for
  strings that are not classes.
- **Related documentation:** [Engineering Standards](../docs/ENGINEERING_STANDARDS.md#theme-tokens-and-tailwind-v4) (PR #106)

## Adding a decision

For each durable decision, include a date, status, decision owner (only when
known), context, chosen option, rationale, and consequences. Link the affected
ADR/spec/runbook. Do not turn an assumption into a decision; keep unresolved
items in the open list until confirmed.
