---
name: security-audit
description: Procedure and checklist for an authorized security and privacy review of this repository's own application, mapped to OWASP Top 10:2025, OWASP ASVS 5.0 Level 2 (Level 3 for payment paths), OWASP API Security Top 10 and WSTG. Use when reviewing access control, authentication, sessions, input handling, uploads, payments, webhooks, configuration, dependencies or personal-data handling.
---

# Security and privacy review

Authorized scope: this repository and the **local stack** only (`local-stack`
skill). Production gets passive read-only checks only, as listed in the audit
README. Record every result with the `audit-finding` skill.

## Method

1. **Read before probing.** For each area, read the route, middleware and tests
   first. Many controls are already present (see "Known controls").
2. **Prefer existing test harnesses.** Write checks as Jest/supertest tests in
   the audit `scripts/` folder or as Playwright specs against localhost, so they
   can become permanent regression tests.
3. **Two accounts per role.** Every object-level check uses two accounts of the
   same role, created locally, plus a guest.
4. **Record, don't exploit further.** Once a weakness is confirmed with minimal
   evidence, stop, record and move on. No chaining, no data extraction beyond the
   one record that proves it.
5. **Never** test against hosted services, use real credentials or personal
   data, or run automated scanners at production hosts.

## Checklist (map each item to a finding or an explicit "verified OK" note)

Paths without a package prefix are under `backend/`.

| Area | What to verify | Where in this repo | Standard |
|---|---|---|---|
| Object-level access | Every `:id` in paths and bodies is ownership-checked server-side | `backend/routes/*.ts`, `__tests__/ownershipChecks.test.ts` | A01:2025, API1:2023, ASVS V8 |
| Function-level access | Admin/devops/internal routes need the right role or secret | `routes/admin.ts`, `devops.ts`, `internalJobs.ts`, `middleware/auth.ts` | A01:2025, API5:2023 |
| Property-level access | Writes accept only allow-listed fields; responses omit private fields | `utils/crud.ts`, `lib/contactPrivacy.ts`, `lib/siteVisibility.ts` | API3:2023, ASVS V8 |
| Real/Demo isolation | No read or write crosses environments; caches split | `db/pool.ts`, `middleware/demoEnvironment.ts`, `realMode.ts` | A01:2025 |
| Authentication | Enumeration, OTP limits, reset-token lifetime and single use, password policy (NIST SP 800-63B) | `routes/auth.ts`, `lib/authSecurityStore.ts` | A07:2025, ASVS V6 |
| Sessions and tokens | Expiry, rotation, revocation (incl. Redis-down behaviour), cookie flags, logout | `middleware/auth.ts`, `frontend-next/api/client.ts` | A07:2025, ASVS V7, V9 |
| OAuth | `state`/nonce, redirect validation, email-verified check | `routes/auth.ts` Google flow | A07:2025, ASVS V10 |
| CSRF and CORS | Cookie-authenticated writes require trusted origin; CORS list is exact | `lib/corsOrigins.ts`, `index.ts` | A01:2025, ASVS V3 |
| Input handling | Parameterized SQL everywhere; identifier allowlists; output encoding; rich text sanitized | `utils/crud.ts`, routes with dynamic SQL | A05:2025, ASVS V1, V2 |
| Server-side requests | URL-fetching features validate scheme, host, resolved IP and redirects | `services/ssrfValidator.ts`, `routes/proxy.ts`, `sharePreview.ts`, `externalSources.ts` | A01:2025 (SSRF), ASVS V1 |
| Uploads | Type by content signature, size limits, safe storage and serving headers | `middleware/upload.ts`, `__tests__/uploadValidation.test.ts` | ASVS V5 |
| Business logic | Price/quantity/coupon/stock rules enforced server-side; idempotent orders | `routes/orders.ts`, `directOrders.ts`, `coupons.ts`, `services/orderInventory.ts` | A06:2025 |
| Webhooks and payments | Signature verification, replay/duplicate handling, out-of-order events, test-mode isolation | `routes/orders.ts` webhook, `subscriptions*.ts`, `lib/chapaClient.ts` | A08:2025, ASVS L3 |
| Rate limiting | Sensitive and expensive endpoints limited; behaviour across instances | `index.ts` `rlOpts`, `services/rateLimiter.ts` | API4:2023 |
| Configuration | Security headers, CSP strictness, error verbosity, exposed files, `security.txt` | `index.ts` helmet, `frontend-next/next.config.ts`, `public/.well-known/` | A02:2025 |
| Supply chain | `npm audit`, OSV, lockfiles, SBOM, pinned Actions, audit-ignore list justified | `package-lock.json`, `.github/workflows/`, `backend/scripts/audit-ignore-list.cjs` | A03:2025 |
| Secrets | No secrets in tree or history; client bundles hold only public keys | whole repo, `frontend-next/.next` build | A04:2025 |
| Logging | Security events logged with who/what/when; no tokens/PII in logs; alerts wired | `lib/logger.ts`, `auditLogger.ts`, `errorCollector.ts`, `alerts.ts` | A09:2025, ASVS V16 |
| Error handling | No stack traces to clients; fails closed when dependencies are down | `lib/apiError.ts`, `errorCollector.ts` | A10:2025 |
| AI features | Prompt-injection resistance, output handling, data sent to providers | `routes/ai.ts`, `lib/ai.ts`, `lib/aiGuidePrompt.ts` | OWASP LLM Top 10 2025 |
| Privacy | Export and deletion complete; retention jobs run; no PII in URLs/analytics/Sentry; consent before trackers | `lib/accountData.ts`, `db/cleanupStories.ts`, `lib/sentry.ts`, `frontend-next/lib/sentry.ts` | GDPR Art. 5, 15, 17, 25; Ethiopia Proc. 1321/2024 |

## Known controls (verify they still hold; record as POSITIVE)

- Seed and admin scripts refuse non-local databases (`db/operationSafety.js`).
- Access token in memory only, refresh token HttpOnly (`frontend-next/api/client.ts`).
- SSRF validator with property-based tests (`test/ssrf.pbt.test.js`).
- Upload content-signature check (`__tests__/uploadValidation.test.ts`).
- Real/Demo isolation verified at startup (`db/pool.ts` `verifySharedDatabaseIsolation`).

## Scoring

CVSS v4.0 base score with full vector for every confirmed security finding above
Info. Use ASVS Level 2 by default; Level 3 for orders, subscriptions, payouts and
webhooks.
