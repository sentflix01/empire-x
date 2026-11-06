# Regression starters (from the 2026-11 audit)

Ready-to-adopt checks for the findings most likely to regress. They are **not
wired into CI** (the audit changed no product code). To adopt one, copy it to
the path named in its header, install the listed dev dependency, and add it to
`.github/workflows/ci.yml`.

| File | Guards | Copy to |
|---|---|---|
| `a11y.spec.ts` | F-041–F-044 (axe WCAG 2.2 AA on key pages) | `frontend-next/e2e/` |
| `request-budget.spec.ts` | F-040 (request loops), F-048 (service worker installs) | `frontend-next/e2e/` |
| `route-contract.test.ts` | F-001–F-006 (frontend calls a route that does not exist) | `backend/__tests__/` |
| `lighthouserc.json` | F-045 (LCP / JS weight budgets) | `frontend-next/` |
| `security-scans.yml` | F-024 (secret scanning), A02/A05 baseline (ZAP) | `.github/workflows/` |

Pin every action and package to an exact version (commit SHA for actions) when adopting.
