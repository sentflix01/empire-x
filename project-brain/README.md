# Nodbusiness Project Brain

This folder is the small, maintained starting point for people and coding
assistants working in this repository. It explains where trusted project
knowledge lives and how to resolve conflicts. It is an index and governance
layer, **not a duplicate of the existing engineering handbook**.

## Project at a glance

Nodbusiness (repository: `empire-x`) is a merchant storefront and ordering
platform. This is a monorepo with a Next.js/React frontend in `frontend-next/`
and a Node.js/Express API in `backend/`. PostgreSQL is the primary database;
supporting integrations include Redis/queues, payments, real-time messaging,
storage, email, and AI providers. Verify exact versions and enabled providers
from package manifests and the relevant runtime configuration; do not infer
them from an old overview.

## How to use this folder

1. Read this page before taking on work.
2. Identify the task's source of truth in the document register below.
3. Check the corresponding implementation and tests. Documentation describes
   intent; code and tests describe current implementation, and production
   configuration describes what is actually deployed.
4. If those sources disagree, pause, report the exact conflict, and request or
   record a decision. Do not silently treat a stale document or a bug as the
   intended behavior.
5. Update the relevant source document when behavior changes. Add durable
   decisions to [DECISIONS.md](DECISIONS.md); add a line to
   [CHANGELOG.md](CHANGELOG.md) when this brain's contents or structure changes.

Use [GLOSSARY.md](GLOSSARY.md) for project vocabulary. Read the repository
instructions in [../AGENTS.md](../AGENTS.md) and the Next.js-specific generated
instructions in [../frontend-next/AGENTS.md](../frontend-next/AGENTS.md) when
working in that package.

## Source precedence

There is no single document that overrides every other kind of evidence. Use
the source appropriate to the question:

| Question | Preferred source |
|---|---|
| What should the product do? | The current task's explicit acceptance criteria, then the approved feature PRD/spec under `docs/product/` |
| Why was an architecture choice made? | `docs/architecture/ADR.md` and accepted decisions in this folder |
| What does the application currently do? | Current implementation and its tests; treat an implementation/requirement mismatch as a defect or unresolved question, not as automatic approval |
| What is deployed or configured live? | Current deployment configuration and the provider's live settings; never assume local files prove production state |
| How should code be changed, tested, or released? | `CONTRIBUTING.md`, `docs/ENGINEERING_STANDARDS.md`, relevant `docs/best-practice/` guides, and package scripts |
| What is exploratory or historical? | `note/` and dated work notes; these are not requirements unless adopted into an approved product/engineering document |

An explicit instruction from the project owner for the current task can refine
scope, but it does not make unsafe handling of secrets or user data acceptable.
When equally authoritative sources conflict, ask before making a product,
security, data, or deployment choice.

## Document register

Paths are relative to the repository root. Read only the entries relevant to
the task; this list is an index, not a requirement to read the whole handbook.
The owning team is the project maintainers unless another owner is named in
the document. Dates/statuses are not repeated here where the source itself
maintains them.

| Area | Start here | Other useful sources |
|---|---|---|
| Product purpose and scope | `docs/product/NORTH_STAR.md` | `docs/product/PRD.md`, `docs/product/ROADMAP.md`, `docs/product/USER_RESEARCH.md` |
| Requirements and experience | `docs/product/PRD.md` | `docs/product/ACCESSIBILITY.md`, `docs/product/LOCALIZATION.md`, `docs/product/DESIGN_SYSTEM.md`, feature-specific specs in `docs/` |
| System architecture | `docs/architecture/C4.md` | `docs/architecture/ADR.md`, `docs/architecture/SEQUENCE_DIAGRAMS.md`, `docs/architecture/ERD.md`, `docs/architecture/DATA_FLOW.md` |
| Security and privacy | `SECURITY.md` | `docs/architecture/THREAT_MODEL.md`, `docs/backend/SECURITY.md`, `docs/best-practice/security.md` |
| Backend/API | `docs/backend/API_REFERENCE.md` | `docs/backend/API.md`, `docs/backend/DATABASE.md`, `docs/backend/PAYMENT_INTEGRATION.md`, `backend/` source and tests |
| Frontend/UI | `docs/frontend/COMPONENTS.md` | `docs/frontend/STATE_MANAGEMENT.md`, `frontend-next/` source and tests |
| Local setup | `docs/ONBOARDING.md` | Root `README.md`, package manifests, `.env.example` files |
| Engineering and quality | `CONTRIBUTING.md` | `docs/ENGINEERING_STANDARDS.md`, `docs/best-practice/quality.md`, package scripts, `.github/workflows/` |
| Operations/release | `docs/operations/DEPLOYMENT.md` | `docs/operations/ENVIRONMENT_VARIABLES.md`, `docs/operations/RUNBOOKS.md`, `docs/operations/BACKUPS.md`, `docs/operations/MONITORING.md` |
| Performance and reliability | `docs/best-practice/performance.md` | `docs/best-practice/observability.md`, `docs/PRODUCTION_READINESS_SCORECARD.md` |
| Current known work | `docs/operations/TECHNICAL_DEBT.md` | `docs/PRODUCTION_READINESS_SCORECARD.md`; verify each item is still current |
| Exploratory notes | `note/README.md` | Contents of `note/` are non-authoritative until adopted into a maintained spec |

## Keep this brain trustworthy

- Keep maintained requirements and technical documentation in their existing
  `docs/` locations; do not copy entire handbooks into this folder.
- Mark assumptions and unresolved questions explicitly. Never invent a
  historical decision or assign a decision to someone without evidence.
- Keep transient task details in the issue/pull request or a clearly dated
  work note; do not turn temporary notes into permanent policy by accident.
- Never store secrets, environment values, personal/customer data, payment
  data, or production database exports here.
- Update this register when an authoritative document is added, moved, or
  retired.
