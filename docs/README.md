# Halehame — Engineering & Product Handbook

> This is the operating manual for Halehame. Treat it as seriously as the source code.
> Every important decision, system design, legal consideration, and operational procedure lives here.
> **Last updated:** August 2026 — reflects current production state.

---

## Start Here

New to the project? Read in this order:

1. `docs/product/NORTH_STAR.md` — Why Halehame exists
2. `docs/ONBOARDING.md` — Get your dev environment running in 30 minutes
3. `docs/architecture/C4.md` — Understand the full system
4. `docs/architecture/ADR.md` — Understand why decisions were made
5. `docs/ENGINEERING_STANDARDS.md` — Rules everyone follows
6. `docs/operations/ENVIRONMENT_VARIABLES.md` — Every env var explained

---

## Complete Document Index

### 📐 Architecture

| Document | Description |
|---|---|
| `architecture/ADR.md` | Architecture Decision Records — why key choices were made |
| `architecture/C4.md` | C4 diagrams: Context → Container → Component → Code |
| `architecture/ERD.md` | Database entity relationships |
| `architecture/SEQUENCE_DIAGRAMS.md` | Auth, orders, chat, AI — full request flows |
| `architecture/THREAT_MODEL.md` | Security threats, mitigations, remaining work |
| `architecture/DATA_FLOW.md` | **NEW** — How data moves through key user journeys |
| `architecture/API_VERSIONING.md` | **NEW** — API versioning strategy + changelog |
| `architecture/MOBILE_STRATEGY.md` | **NEW** — PWA → TWA → React Native roadmap |

---

### 🔧 Backend

| Document | Description |
|---|---|
| `backend/API.md` | Every endpoint documented |
| `backend/DATABASE.md` | Schema, migrations, conventions, useful queries |
| `backend/SECURITY.md` | Auth layers, input validation, rate limiting |
| `backend/PAYMENT_INTEGRATION.md` | **NEW** — Full Stripe + Chapa technical reference |

---

### 🖥 Frontend

| Document | Description |
|---|---|
| `frontend/COMPONENTS.md` | Component standards, accessibility, patterns |
| `frontend/STATE_MANAGEMENT.md` | Auth context, cart context, Zustand slices |

---

### ⚖️ Legal

| Document | Description |
|---|---|
| `legal/TERMS_OF_SERVICE.md` | **NEW** — User agreement (draft, needs legal review) |
| `legal/PRIVACY_POLICY.md` | **NEW** — GDPR/Ethiopian data protection (draft) |
| `legal/CONTENT_POLICY.md` | **NEW** — What is/isn't allowed on the platform |
| `legal/COMPLIANCE.md` | **NEW** — Regulatory obligations by jurisdiction |
| `legal/COOKIE_POLICY.md` | **NEW** — What cookies and local storage we use |
| `legal/SELLER_AGREEMENT.md` | **NEW** — Contractual terms for sellers (draft) |

---

### 📈 Growth

| Document | Description |
|---|---|
| `growth/COMPETITIVE_ANALYSIS.md` | **NEW** — Facebook, LinkedIn, WeChat, Gojek, Telebirr comparison |
| `growth/MONETIZATION.md` | **NEW** — 7 revenue streams, projections, unit economics |
| `growth/GROWTH_STRATEGY.md` | **NEW** — 0→1M users: phases, channels, flywheel |
| `growth/INTERNATIONALISATION.md` | **NEW** — Languages, currencies, East Africa expansion |
| `growth/SCALABILITY.md` | **NEW** — Architecture for 10K → 10M users |
| `growth/PARTNERSHIP_STRATEGY.md` | **NEW** — Telebirr, CBE, Ethiopian Airlines, universities |

---

### 🛍 Product

| Document | Description |
|---|---|
| `product/NORTH_STAR.md` | Why Halehame exists and what it will never be |
| `product/PRD.md` | Product Requirement Documents |
| `product/ROADMAP.md` | 2026 → 2030 milestones + tech debt |
| `product/NORTH_STAR_METRICS.md` | **NEW** — The metric that matters + leading indicators |
| `product/USER_RESEARCH.md` | **NEW** — 5 personas + journey maps |
| `product/SAFETY_TRUST.md` | **NEW** — How Halehame keeps users safe |
| `product/DESIGN_SYSTEM.md` | **NEW** — Brand, colors, typography, components |
| `product/ACCESSIBILITY.md` | **NEW** — WCAG 2.1 AA standards + audit process |
| `product/SELLER_HANDBOOK.md` | **NEW** — Complete guide for sellers |

---

### 🔧 Operations

| Document | Description |
|---|---|
| `operations/DEPLOYMENT.md` | Deploy architecture + configuration |
| `operations/MONITORING.md` | Sentry, Pino, health checks, dashboards |
| `operations/RUNBOOKS.md` | Step-by-step incident response (8 runbooks) |
| `operations/BACKUPS.md` | Database backup and recovery procedures |
| `operations/TECHNICAL_DEBT.md` | Known issues, prioritized |
| `operations/KEPLOY.md` | API test recording with Keploy |
| `operations/INCIDENT_RESPONSE.md` | **NEW** — P0–P3 severity levels + response playbooks |
| `operations/ENVIRONMENT_VARIABLES.md` | **NEW** — Every env var explained with examples |

---

### ✅ Best Practices

| Document | Description |
|---|---|
| `best-practice/README.md` | Overview of engineering best practices |
| `best-practice/architecture.md` | Architectural patterns and decisions |
| `best-practice/observability.md` | Logging, metrics, alerting |
| `best-practice/performance.md` | Performance optimisation patterns |
| `best-practice/quality.md` | Code quality standards |
| `best-practice/release-process.md` | How to release safely |
| `best-practice/security.md` | Security patterns and checklist |

---

### 📝 Root Docs

| Document | Description |
|---|---|
| `README.md` | ← You are here |
| `ONBOARDING.md` | New developer setup — productive in 30 minutes |
| `ENGINEERING_STANDARDS.md` | Git, naming, API, testing, feature flag standards |
| `gap-fixes-decisions.md` | Decisions log for the 13-bug gap-fixes sprint |
| `spec-decisions-index.md` | Index of all spec decision documents |

---

## Five Operating Systems of Halehame

Halehame is not just an app — it is five operating systems working together.

### 1. Product OS — How ideas become features
```
Idea → Research → PRD → Design → Development → Testing → Deployment → Analytics → Improvement
```

### 2. Engineering OS — How code moves to production
```
Task → Code → Pull Request → Code Review → Tests → Deployment → Monitoring → Feedback
```

### 3. Business OS — How money flows
```
User → Purchase → Payment (Stripe/Chapa) → Commission → Revenue → Growth
```

### 4. Trust OS — How users stay safe
```
Content Policy → Moderation → Reports → Admin Review → Action → Appeal
```

### 5. Growth OS — How Halehame expands
```
Sellers acquired → Products listed → Buyers discover → Transactions → Revenue → More investment
```

---

## Current Platform Health (August 2026)

| Metric | Status |
|---|---|
| Backend tests | 252 passing (17 suites) |
| Frontend tests | 68 passing (11 suites) |
| TypeScript errors | 0 |
| DB migrations | 28 (migrate.js → migrate28.js) |
| Views with ErrorBoundary | 45/45 |
| Native dialogs (alert/confirm/prompt) | 0 |
| Stripe integration | ✅ Full (checkout, webhook, success/cancel pages) |
| Chapa integration | ✅ Full (ETB native, sandbox mode) |
| Admin ban enforcement | ✅ Live (migrate28) |
| Revenue chart | ✅ Live (admin overview) |

---

## Definition of Done

A feature is not done until all of these are true:

- [ ] Code written and reviewed
- [ ] Tests passing (unit + integration)
- [ ] Security reviewed (auth check, input validation, ownership check)
- [ ] Performance checked (no N+1 queries)
- [ ] Accessibility verified (keyboard, ARIA, color contrast)
- [ ] Documentation updated (API docs, ADR if architectural)
- [ ] Monitoring in place (Sentry captures errors)
- [ ] Feature flag configured if gradual rollout needed
- [ ] Product approved

---

## Quick Reference

| I want to... | Go to |
|---|---|
| Get started as a new developer | `ONBOARDING.md` |
| Understand the system architecture | `architecture/C4.md` |
| Know why a decision was made | `architecture/ADR.md` |
| See data flow for a feature | `architecture/DATA_FLOW.md` |
| Integrate Stripe or Chapa | `backend/PAYMENT_INTEGRATION.md` |
| Understand the database | `backend/DATABASE.md` |
| Look up an API endpoint | `backend/API.md` |
| Know the security model | `architecture/THREAT_MODEL.md` |
| Understand legal obligations | `legal/COMPLIANCE.md` |
| Know our competitors | `growth/COMPETITIVE_ANALYSIS.md` |
| Understand how we make money | `growth/MONETIZATION.md` |
| Expand to a new country | `growth/INTERNATIONALISATION.md` |
| Scale to 1M users | `growth/SCALABILITY.md` |
| Find our users and their needs | `product/USER_RESEARCH.md` |
| Measure the right things | `product/NORTH_STAR_METRICS.md` |
| Keep the platform safe | `product/SAFETY_TRUST.md` |
| Design consistently | `product/DESIGN_SYSTEM.md` |
| Make it accessible | `product/ACCESSIBILITY.md` |
| Help sellers succeed | `product/SELLER_HANDBOOK.md` |
| Respond to an incident | `operations/INCIDENT_RESPONSE.md` |
| Know all environment variables | `operations/ENVIRONMENT_VARIABLES.md` |
| Deploy to production | `operations/DEPLOYMENT.md` |
| Know coding standards | `ENGINEERING_STANDARDS.md` |
