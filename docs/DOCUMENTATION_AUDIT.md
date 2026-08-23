# Documentation Audit Register — 2026-08-23

> Full-audit of `docs/` (170+ files) against world-class engineering-org practice
> (Google SRE, Stripe API docs, Meta/Telegram/Amazon product ops) and against the actual code.
> **This file tracks remediation status.** Items are P0 (wrong/dangerous info) → P3 (polish).
> Rule going forward: any PR that changes behavior updates its doc in the same PR.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SLO | Service Level Objective |
| RTO/RPO | Recovery Time / Point Objective |
| ADR | Architecture Decision Record |
| FF | Feature Flag |
| KYC | Know Your Customer |
| CSAM | Child Sexual Abuse Material |

---

## Fixed in this pass ✅

| Area | Fix |
|------|-----|
| Severity chaos | Created canonical `operations/SEVERITY_LEVELS.md`; RUNBOOKS/ON_CALL/INCIDENT_RESPONSE now reference it |
| Broken incident commands | INCIDENT_RESPONSE rewritten (valid SQL, real breach procedure); DISASTER_RECOVERY's ineffective `revoke_before:all` and impossible mass-delete trigger replaced; FF env-var myth corrected to Redis fast-path |
| Fictional CI | CI_CD_PIPELINE.md rewritten against actual workflows, honest gap plan added |
| FEATURE_FLAGS.md | Fully rewritten from `DEFAULT_FLAGS` (20 real flags); removed fictional DB table + non-existent frontend hook |
| Chapa fiction | PAYMENT_INTEGRATION.md: removed non-existent `/chapa/webhook` + `/chapa/status` endpoints; documented pull-based verify flow; TD-015 filed for the frontend polling the ghost endpoint |
| THREAT_MODEL | "Remaining work" corrected — 4 already-shipped controls marked done; real gaps listed (localStorage token, TLS verify, SVG, audit log…) |
| SECURITY.md | Removed false express-validator/dev-rate-limit claims; documented real auth flow incl. token-type enforcement |
| Money truth | Created canonical `architecture/CURRENCY_AND_COMMISSION.md` (ETB ledger, flat 3%, payout reality); reconciled SELLER_AGREEMENT, SELLER_HANDBOOK, FINANCIAL_MODEL, NORTH_STAR, CAPACITY_PLANNING, COST_BREAKDOWN |
| Age policy | Standardized 18+ (T&S framework aligned with ToS/Privacy/Checklist) |
| Escrow misrepresentation | Marked planned-not-live in TRUST_SAFETY_FRAMEWORK |
| Stale sweeps | 32 docs de-`.js`-ified; DATABASE.md full 34-migration registry + tracker description; TECHNICAL_DEBT TD-004 closed, TD-014…019 opened; CHANGE_LOG v1.0.0 entry; ENV vars required-set corrected; ROADMAP shipped-status reconciled & made authoritative |
| Repo standards | Root CONTRIBUTING.md, SECURITY.md (disclosure policy), .github/dependabot.yml created |
| Hygiene | Brand artifacts scrubbed (`hale_live_` → `nodb_live_`, HaleHame typosquat list), `[Date]` placeholders filled, duplicate headings repaired, DEPLOYMENT table corruption fixed, broken `growth/SCALABILITY.md` index link removed |

## Open items

### P1 — contradictions that remain open (need owner decisions)

| # | Item | Where |
|---|------|-------|
| O-1 | Growth numbers conflict internally & across docs (10K vs 50K MAU same phase; $5M/mo vs $10M/yr GMV). Needs one numbers sheet. | growth/GROWTH_STRATEGY, strategy/GO_TO_MARKET, product/NORTH_STAR |
| O-2 | Subscription pricing: 299/999 ETB vs $19/$49/$99 tiers. Pick one model pre-launch. | growth/MONETIZATION, strategy/GO_TO_MARKET |
| O-3 | CSAM SLA: T&S Framework 1h vs Moderation Ops 15min. Adopt **15 min** (stricter) everywhere. | trust-safety/* |
| O-4 | Contact domain split-brain (.app vs .com across ~12 docs). Decide canonical domain once registered; sweep. | legal/, compliance/, support/ |
| O-5 | Core hours conflict (10–16 EAT vs 10–14 UTC ≈ 13–17 EAT) and setup allowance ($500 vs $1000). | people/CULTURE vs REMOTE_WORK; COMPENSATION |
| O-6 | Dispute/refund thresholds (<2% vs <5%; refunds <3% revenue vs <5% orders). Harmonize. | NORTH_STAR, FRAUD_PREVENTION, CUSTOMER_SUPPORT_FRAMEWORK |
| O-7 | Transparency report cadence (semi-annual vs annual) + no template. Create template, pick cadence. | trust-safety/TRUST_SAFETY_FRAMEWORK, SAFETY_TRUST_PRODUCT |
| O-8 | DESIGN_SYSTEM drift vs code (`--ex-gold` #D4AF37 vs #f59e0b; Playfair vs Georgia; radius rules vs button.tsx). Update tokens or code — one PR each way. | product/DESIGN_SYSTEM, strategy/STANDARDS, globals.css |
| O-9 | i18n doc describes namespaced locales; reality is flat single-namespace. LOCALIZATION rewrite + one language roadmap. | product/LOCALIZATION, growth/INTERNATIONALISATION |
| O-10 | Entity identity unresolved for contracts (Delaware Inc vs Ethiopian PLC signs ToS?). Resolve before publishing ToS/Seller Agreement. | legal/TERMS_OF_SERVICE §10, finance/TAX_STRUCTURE |

### P2 — documentation debt (rewrite/update when touched next)

| # | Item | Where |
|---|------|-------|
| O-11 | API.md covered ~10 of 44 route modules with wrong auth notes on money endpoints — **✅ addressed 2026-08-23**: API.md rewritten as conventions overview; `API_REFERENCE.md` now auto-generates all 255+ endpoints from source (`npm run docs:api`); machine-readable twin at backend/api-catalog.json. Remaining: per-endpoint request/response examples (OpenAPI). | backend/API.md, docs/backend/API_REFERENCE.md |
| O-12 | ERD missing 11 tables (webhook_events, error_events, conversation_participants, external_* …) | architecture/ERD.md |
| O-13 | DATA_FLOW JWT section wrong (says RS256/7d/email-role claims; real: HS256/15min/{sub,type,jti}); feed algorithm section stale | architecture/DATA_FLOW.md |
| O-14 | SEQUENCE_DIAGRAMS: Chapa "(planned)" label + chapa-webhook diagram, returns auto-refund step, PostGIS references | architecture/SEQUENCE_DIAGRAMS.md |
| O-15 | C4 route count (35→44), Supabase-first storage, missing middleware layers | architecture/C4.md |
| O-16 | STATE_MANAGEMENT omits live Zustand layer ("don't use Redux" framing contradicts store/index.ts) | frontend/STATE_MANAGEMENT.md |
| O-17 | MONITORING_STACK Sentry v7 APIs on a v10 SDK sample; duplicate monitoring content across 3 folders — consolidate | infrastructure/ + operations/ + best-practice/ |
| O-18 | SCALING_PLAN vs SCALABILITY_PLAN_GROWTH ~70% overlap with different numbers — merge into one staged plan | infrastructure/ |
| O-19 | BACKUPS: no automated backup exists yet despite RTO/RPO table; implement dump-to-R2 job + restore verification before trusting DR doc — **✅ implemented 2026-08-23** (scripts/backup-database.js + verify-backup.js, TD-020). Remaining operator steps: configure R2 in prod, ensure postgresql-client in the Railway image, schedule weekly verify. | operations/BACKUPS.md, infrastructure/DISASTER_RECOVERY.md |
| O-20 | KEPLOY instructions target non-existent `node index.js` entrypoint | operations/KEPLOY.md |
| O-21 | Load-test scripts referenced but absent (`scripts/load-test-*.js`) — write them or drop claims | CAPACITY_PLANNING, SCALABILITY_PLAN_GROWTH |
| O-22 | A_B_TESTING references non-existent experiments lib/hook; no analytics SDK installed — either build assignment infra or reframe as design-only | product/A_B_TESTING.md |
| O-23 | Cookie Policy stale (claims localStorage 7d JWT, HttpOnly "planned") — contradicts shipped refresh-cookie architecture; also discloses neither FX conversion nor analytics cookies honestly | legal/COOKIE_POLICY.md |
| O-24 | Verification route ↔ migrate13 schema mismatch breaks KYC badge flow at runtime (code bug surfaced by docs audit — see TECHNICAL_DEBT) | backend/routes/verification.ts |

### P3 — polish

- Unify "Last updated" dating (bulk August-2026 stamps defeat freshness signal).
- Replace repo-path citations inside user-facing contracts (ToS cites `docs/legal/…`).
- Status page host named 3 ways → standardize on `status.nodbusiness.app`.
- STALE facts: UK VAT £85k threshold; superseded Ethiopian proclamations cited (652/2009, 590/2008) — counsel review needed.
- WhatsApp-Amharic claim false in COMPETITIVE_ANALYSIS benchmark table.

## What "world-class" still needs (roadmap, not doc edits)

1. **Generated API reference** (OpenAPI spec from routes + examples + error-code registry).
2. **Analytics substrate** — every metrics doc assumes events no SDK provides; install PostHog or equivalent before trusting dashboards.
3. **SLO wiring** per `infrastructure/SLO.md §5`.
4. **Launch review gates** — privacy/security/legal checkboxes wired into the PRD template.
5. **Moderation transparency report** template + baseline publication from day one.
6. **Seller scorecard** unifying fraud tiers + fulfillment metrics with seller-facing display.
7. **Docs CI** — link checker + stale-flag bot that opens issues when `DEFAULT_FLAGS`, routes, or migrations change without doc updates.
