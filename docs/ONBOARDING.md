# Halehame — Developer Onboarding

> If five developers joined tomorrow, this is how they'd get productive in a week.
> Welcome to Halehame. Read this first.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| OTP | One-Time Password — 6-digit verification code |
| API | Application Programming Interface |
| DB | Database |
| JWT | JSON Web Token |
| CI/CD | Continuous Integration / Continuous Delivery |
| ADR | Architecture Decision Record |
| ERD | Entity Relationship Diagram |
| PWA | Progressive Web App |
| PR | Pull Request |
| SOP | Standard Operating Procedure |

---

## Day 1 — Understand the product

1. Read `docs/product/NORTH_STAR.md` — understand *why* Halehame exists and what we're building
2. Read `docs/README.md` — understand the engineering handbook structure
3. Set up local dev (see below)
4. Register a test account, create a product, place an order — experience the product as a user

---

## Day 2 — Understand the architecture

1. Read `docs/architecture/C4.md` — see the full system at all four levels
2. Read `docs/architecture/ADR.md` — understand *why* key decisions were made
3. Read `docs/architecture/SEQUENCE_DIAGRAMS.md` — see how auth, payments, and chat work
4. Read `docs/architecture/ERD.md` — understand the database relationships

---

## Day 3 — Understand the code

1. Read `docs/ENGINEERING_STANDARDS.md` — the rules everyone follows
2. Explore `backend/routes/` — pick one route file and read it end-to-end
3. Explore `frontend-next/app/(app)/` — pick one page and trace it from route → component → API call
4. Look at `docs/operations/TECHNICAL_DEBT.md` — understand what's known to need improvement

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use Docker Compose)
- Git

### Quick start

```bash
# 1. Clone the repo
git clone https://github.com/your-org/halehame.git
cd halehame

# 2. Backend setup
cp backend/.env.example backend/.env
# Edit backend/.env:
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/halehame
#   JWT_SECRET=any-long-random-string-for-local-dev

# 3. Create database and run migrations
psql -U postgres -c "CREATE DATABASE halehame;"
cd backend && npm install && npm run migrate

# 4. Seed test data (optional)
npm run seed

# 5. Start backend
npm run dev
# → http://localhost:3001

# 6. Frontend setup (new terminal)
cd ../frontend-next
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000

# 7. Register your first account
# Go to http://localhost:3000/register
# OTP prints to the backend terminal in yellow
```

### Using Docker Compose (alternative)

```bash
docker compose up
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# Health:   http://localhost:3001/health
```

---

## Key Files to Know

| File | What it does |
|---|---|
| `backend/index.js` | App entry point — middleware, routes, server startup |
| `backend/utils/crud.js` | Generic CRUD helpers — used by most route files |
| `backend/lib/ai.js` | AI abstraction — supports OpenAI/Gemini/Anthropic |
| `backend/lib/featureFlags.js` | Feature flag system with % rollouts |
| `backend/lib/queue.js` | BullMQ background jobs with sync fallback |
| `backend/middleware/auth.js` | JWT auth — `requireAuth`, `optionalAuth`, `requireAdmin` |
| `frontend-next/lib/AuthContext.tsx` | Auth state — the single source of truth for user |
| `frontend-next/lib/CartContext.tsx` | Cart state — syncs with backend |
| `frontend-next/api/entities.ts` | Typed API layer for all entities |
| `frontend-next/api/client.ts` | Axios client — auto-attaches JWT, handles 401 |
| `frontend-next/components/layout/AppLayout.tsx` | Main authenticated layout |

---

## How to Add a New Feature

### Backend — new API endpoint

1. Create or open `backend/routes/feature.js`
2. Add the route with `requireAuth`, input validation, ownership check, error handling
3. Register in `backend/index.js`: `app.use('/api/feature', require('./routes/feature'))`
4. Add any new tables to a new migration file (`migrate9.js`, etc.)
5. Add new table names to `ALLOWED_TABLES` in `backend/utils/crud.js`
6. Document the endpoint in `docs/backend/API.md`

### Frontend — new page

1. Create `frontend-next/app/(app)/feature/page.tsx`
2. If it needs auth: it's automatically protected by `AppLayout` (the `(app)` layout group)
3. If it needs server rendering: keep it a Server Component, fetch in the page function
4. If it needs client interactivity: add `'use client'` and use TanStack Query
5. Add it to the sidebar nav in `AppLayout.tsx` if it's a main navigation item

### Feature flag

```js
// 1. Add to DEFAULT_FLAGS in backend/lib/featureFlags.js
my_feature: { enabled: false, rollout: 0, description: 'My new feature' }

// 2. Check in route
if (await isEnabled('my_feature', req.user.id)) { ... }

// 3. Enable for yourself in .env
FF_MY_FEATURE=true
```

---

## Who to Ask

| Question | Source |
|---|---|
| Why was X built this way? | `docs/architecture/ADR.md` |
| How does X flow work? | `docs/architecture/SEQUENCE_DIAGRAMS.md` |
| What's the database schema? | `docs/architecture/ERD.md` |
| What should I build next? | `docs/product/ROADMAP.md` |
| Something is broken in production | `docs/operations/RUNBOOKS.md` |
| What tech debt exists? | `docs/operations/TECHNICAL_DEBT.md` |

---

## Helpful Commands

```bash
# Backend
npm run dev          # Start with nodemon (auto-restart)
npm run migrate      # Run all migrations
npm run seed         # Seed test data
npm test             # Run backend tests

# Frontend
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript type check

# Database (direct)
psql $DATABASE_URL   # Connect to database
\dt                  # List tables
\d products          # Describe products table

# Docker
docker compose up           # Start all services
docker compose down -v      # Stop and clean up
docker compose exec backend npm run migrate  # Run migrations in container
```
