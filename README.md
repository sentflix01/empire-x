# Nodbusiness 👑

A guided digital storefront and ordering platform that helps local merchants build an online presence and connect with customers.

> **Status (September 2026):** Production-ready. 75+ features built, TypeScript 0 errors, full Stripe + Chapa payment integration, real-time chat, admin panel, Personal/Business feed toggle, Google OAuth popup flow.

## Project Structure

```
nodbusiness/
├── frontend-next/   Next.js 16 + TypeScript + TailwindCSS
├── backend/         Node.js + Express + PostgreSQL
├── docs/            Engineering handbook (architecture, runbooks, API docs)
├── note/            Product research and feature roadmap
└── docker-compose.yml
```

## Quick Start

**Prerequisites:** Node.js 18+, PostgreSQL 14+ running locally.

### 1. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL and JWT_SECRET at minimum

# Next.js Frontend
cp frontend-next/.env.local.example frontend-next/.env.local
# NEXT_PUBLIC_API_BASE_URL is already set to http://localhost:3001
```

### 2. Create the database and run migrations

```bash
# Create database (run once)
psql -U postgres -c "CREATE DATABASE nodbusiness;"

# Run all migrations
cd backend && npm run migrate
```

### 3. Start development servers

Open **two terminals**:

```bash
# Terminal 1 — Backend (http://localhost:3001)
cd backend
npm run dev

# Terminal 2 — Next.js Frontend (http://localhost:3002)
cd frontend-next
npm run dev
```

Then open http://localhost:3002

### 4. Register your first account

- Go to http://localhost:3002/register
- Enter email + password
- The 6-digit OTP code prints to the **backend terminal** (yellow) during local dev
- Enter the code → onboarding → you're in

## Documentation

| Document | Description |
|---|---|
| **`project-brain/README.md`** | Project reference — document register, source precedence, and how to navigate the handbook |
| **`docs/README.md`** | Engineering handbook — start here |
| `docs/ONBOARDING.md` | New developer setup guide — productive in 30 minutes |
| `docs/ENGINEERING_STANDARDS.md` | Git, naming, API, testing, feature flag standards |
| `docs/product/NORTH_STAR.md` | Why Nodbusiness exists, who it's for, what it will never be |
| `docs/product/ROADMAP.md` | 2026 → 2030 milestones + tech debt register |
| `docs/product/PRD.md` | Product Requirement Documents for key features |
| `docs/architecture/C4.md` | C4 diagrams: Context → Container → Component → Code |
| `docs/architecture/ADR.md` | Architecture Decision Records (why we chose each tech) |
| `docs/architecture/SEQUENCE_DIAGRAMS.md` | Auth, orders, chat, AI — full request flows |
| `docs/architecture/ERD.md` | Database entity relationships |
| `docs/architecture/THREAT_MODEL.md` | Security threats, mitigations, remaining work |
| `docs/backend/API.md` | Every endpoint documented |
| `docs/backend/DATABASE.md` | Schema, migrations, conventions, useful queries |
| `docs/backend/SECURITY.md` | Auth layers, input validation, rate limiting |
| `docs/frontend/COMPONENTS.md` | Component standards, accessibility, patterns |
| `docs/frontend/STATE_MANAGEMENT.md` | Auth context, cart context, TanStack Query |
| `docs/operations/DEPLOYMENT.md` | Deploy architecture + env vars reference |
| `docs/operations/MONITORING.md` | Sentry, Pino, health checks, CEO dashboard |
| `docs/operations/RUNBOOKS.md` | 8 step-by-step incident response guides |
| `docs/operations/BACKUPS.md` | Database backup, disaster recovery scenarios |
| `docs/operations/TECHNICAL_DEBT.md` | 13 known issues, prioritized |
| `note/` | Non-authoritative product research and exploratory notes |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | **Next.js 16** (App Router), TypeScript, TailwindCSS, shadcn/ui |
| State | TanStack Query, React context |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL 14+ (Supabase Postgres) |
| Cache / Queue | Redis (Upstash) + BullMQ |
| Real-time | Socket.IO |
| File storage | Cloudflare R2 (local disk fallback in dev) |
| Auth | JWT + Google OAuth (popup flow, no GIS script, incognito-safe) |
| Payments | Stripe + Chapa (Ethiopia) |
| Email | Resend (SMTP fallback) |
| AI | OpenAI / Gemini / Anthropic (switchable via env) |
| Hosting | **Render** (backend) · **Vercel** (frontend) · Supabase (database) |

## CI/CD

Every push to GitHub runs tests, linting, and TypeScript checks via `.github/workflows/ci.yml`. Merging to `main` triggers `.github/workflows/deploy.yml` which runs migrations against Supabase, then deploys the backend via a Render deploy hook and the frontend via Vercel CLI.

## Health Check

```
GET http://localhost:3001/health
```

Returns:

```json
{
  "status": "ok",
  "timestamp": "2026-07-06T00:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected | not configured",
    "ai": "openai | gemini | anthropic | not configured",
    "email": "resend | smtp | console",
    "storage": "r2 | local"
  }
}
```

For a staging simulation, `redis`, `ai`, and `storage` may be `not configured` or `local`. For public launch, use managed Redis, configured AI keys if AI features are enabled, and R2 storage.
