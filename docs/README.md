# Nodbusiness — Engineering Handbook

> This is the operating manual for Nodbusiness. Treat it as seriously as the source code.
> Every important decision, system design, and operational procedure lives here.
> Last updated: September 2026

---

## Start Here

New to the project? Read in this order:

1. `docs/product/NORTH_STAR.md` — Why Nodbusiness exists
2. `docs/ONBOARDING.md` — Get your dev environment running in 30 minutes
3. `docs/architecture/C4.md` — Understand the full system
4. `docs/architecture/ADR.md` — Understand why decisions were made
5. `docs/ENGINEERING_STANDARDS.md` — Rules everyone follows

---

## Folder Structure

```
docs/
├── README.md                         ← You are here
├── ONBOARDING.md                     ← New developer setup guide
├── ENGINEERING_STANDARDS.md          ← Git, naming, API, testing standards
│
├── architecture/
│   ├── ADR.md                        Architecture Decision Records
│   ├── C4.md                         C4 diagrams (Context → Container → Component → Code)
│   ├── SEQUENCE_DIAGRAMS.md          How key flows work end-to-end
│   ├── ERD.md                        Database entity relationships
│   └── THREAT_MODEL.md               Security threats and mitigations
│
├── backend/
│   ├── API.md                        Every endpoint documented
│   ├── DATABASE.md                   Schema, migrations, conventions
│   └── SECURITY.md                   Auth, validation, rate limiting
│
├── frontend/
│   ├── COMPONENTS.md                 Component standards and patterns
│   └── STATE_MANAGEMENT.md          Auth, cart, TanStack Query patterns
│
├── product/
│   ├── NORTH_STAR.md                 Why Nodbusiness exists and what it will never be
│   ├── PRD.md                        Product Requirement Documents
│   └── ROADMAP.md                    2026 → 2030 milestones + tech debt
│
└── operations/
    ├── DEPLOYMENT.md                 Deploy architecture + env vars reference
    ├── MONITORING.md                 Sentry, Pino, uptime, dashboards
    ├── RUNBOOKS.md                   Step-by-step incident response (8 runbooks)
    ├── BACKUPS.md                    Database backup and recovery procedures
    └── TECHNICAL_DEBT.md             Known issues, prioritized
```

---

## The Five Operating Systems of Empire X

Nodbusiness is not just an app — it is five operating systems working together.

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
User → Purchase → Payment → Revenue → Taxes → Profit → Reinvestment
```

### 4. People OS — How teammates become productive

```
Hire → Onboard (this handbook) → First task → Code review → Ownership → Leadership
```

### 5. Learning OS — How the company improves

```
Metrics → Problems → Experiments → Results → Knowledge → Better decisions
```

---

## Definition of Done

A feature is not done until all of these are true:

- [ ] Code written and reviewed
- [ ] Tests passing (unit + integration)
- [ ] Security reviewed (auth check, input validation, ownership check)
- [ ] Performance checked (no N+1 queries, no blocking operations)
- [ ] Accessibility verified (keyboard, ARIA, color contrast)
- [ ] Documentation updated (API docs if new endpoint, ADR if architectural change)
- [ ] Monitoring added (errors tracked in Sentry)
- [ ] Feature flag configured (if gradual rollout)
- [ ] Product approved

---

## Engineering Principles

1. **Simplicity over cleverness** — Write code the next developer can understand
2. **Security by default** — Auth checks, input validation, parameterized queries on every endpoint
3. **Automate repetitive work** — If you do it twice, automate it
4. **Measure before optimizing** — Use data, not assumptions
5. **Document important decisions** — ADR for every major technical choice
6. **Build for users, not trends** — Technology serves the product
7. **Every feature behind a flag** — Gradual rollout reduces risk
8. **Every deployment is reversible** — Migrations must be backwards-compatible
9. **No secrets in Git** — Environment variables only
10. **APIs are versioned** — Never break existing integrations silently

---

## Architecture Review Questions

Before implementing a major feature, answer these:

- Does it fit the product vision (see North Star)?
- Is it secure?
- Is it scalable?
- Is it maintainable?
- Can it be tested?
- Can it be monitored?
- Does it introduce unnecessary complexity?
- Does it need an ADR?

---

## Quick Reference

| I want to... | Go to |
|---|---|
| Get started as a new developer | `ONBOARDING.md` |
| Understand why a decision was made | `architecture/ADR.md` |
| See the system architecture | `architecture/C4.md` |
| See how login/payment/chat works | `architecture/SEQUENCE_DIAGRAMS.md` |
| Understand the database | `architecture/ERD.md` |
| Know the security model | `architecture/THREAT_MODEL.md` |
| Look up an API endpoint | `backend/API.md` |
| Add a new migration | `backend/DATABASE.md` |
| Know the frontend patterns | `frontend/COMPONENTS.md` |
| Understand state management | `frontend/STATE_MANAGEMENT.md` |
| Know why Nodbusiness exists | `product/NORTH_STAR.md` |
| Know what to build next | `product/ROADMAP.md` |
| Write a feature spec | `product/PRD.md` |
| Deploy to production | `operations/DEPLOYMENT.md` |
| Set up monitoring | `operations/MONITORING.md` |
| Respond to an incident | `operations/RUNBOOKS.md` |
| Set up backups | `operations/BACKUPS.md` |
| Understand known issues | `operations/TECHNICAL_DEBT.md` |
| Know coding standards | `ENGINEERING_STANDARDS.md` |
