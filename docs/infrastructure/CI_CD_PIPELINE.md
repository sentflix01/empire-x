# Empire X — CI/CD Pipeline

> How code goes from developer laptop to production safely and automatically.
> **Last updated:** August 2026

---

## Pipeline Overview

```
Developer pushes to GitHub
          │
          ▼
GitHub Actions CI (ci.yml)
  ├── Backend: Lint + Test (Jest)
  ├── Frontend: Lint + TypeScript + Build
  └── Security: npm audit
          │
     All pass?
          │
    ┌─────┴──────┐
    ✅ Yes       ❌ No
    │            │
    ▼            └── Block merge, notify developer
    
  Merge to main
          │
          ▼
GitHub Actions Deploy (deploy.yml)
  ├── Run DB migrations → Neon
  ├── Deploy Backend → Railway
  └── Deploy Frontend → Vercel (auto-triggered by Vercel GitHub integration)
          │
          ▼
Post-deploy health check
  └── GET /health → 200 OK?
      ├── ✅ Success → Slack/Telegram notification
      └── ❌ Fail → Rollback + alert on-call
```

---

## CI Pipeline (`.github/workflows/ci.yml`)

### What Runs on Every Push/PR

```yaml
# Current CI jobs:
jobs:
  backend:
    - npm ci
    - npm run migrate (against test PostgreSQL)
    - npm test (Jest — 252 tests)
    
  frontend:
    - npm ci --legacy-peer-deps
    - npm run lint (ESLint)
    - npx tsc --noEmit (TypeScript check)
    - npm run build (Next.js production build)
    
  audit:
    - npm audit --audit-level=high (backend)
    - npm audit --audit-level=high (frontend)
```

### Improvements to Add

```yaml
# Add to ci.yml:

  # 1. Code coverage reporting
  coverage:
    - Jest with --coverage flag
    - Upload to Codecov (free for open source)
    - Fail if coverage drops below 60%

  # 2. E2E tests (future - when Playwright is set up)
  e2e:
    - Start backend against test DB
    - Start frontend in test mode
    - Run Playwright tests for critical flows:
        - Register → OTP → Onboarding
        - Browse marketplace → Add to cart → Checkout
        - Create product listing
        - Send a message

  # 3. Dependency security
  security:
    - npm audit --audit-level=moderate
    - Use snyk for deeper analysis (free tier)
    
  # 4. Bundle size check (frontend)
  bundle-size:
    - npx bundlesize
    - Fail if JS bundle > 300KB initial
```

---

## Deploy Pipeline (`.github/workflows/deploy.yml`)

### Current Flow

```yaml
deploy:
  needs: [backend, frontend]  # Only deploy if CI passes
  
  steps:
    - Run DB Migrations → Neon
    - Deploy Backend → Railway
    - Deploy Frontend → Vercel (separate, auto-triggered)
    - Post-deploy Health Check
```

### Database Migration Strategy

```yaml
# migrations run BEFORE new code deploys
# This ensures: old code + new schema works (backwards compatible)
# New schema is additive only:
#   ✅ ADD COLUMN IF NOT EXISTS
#   ✅ CREATE INDEX IF NOT EXISTS
#   ❌ DROP COLUMN (requires deprecation period first)
#   ❌ RENAME COLUMN (use ADD → backfill → DROP pattern)

migration-step:
  - Runs: node db/migrate-all.js
  - If fails: Stop deploy, alert on-call
  - Time: < 30 seconds for most migrations
```

### Zero-Downtime Deployment

```
Current: Railway does rolling restart
  1. Start new container with new code
  2. Health check passes on new container
  3. Route traffic to new container
  4. Stop old container
  
Time: ~30–60 seconds
Downtime: < 1 second (during traffic switch)
```

**For database schema changes that need coordination:**
```
1. Deploy migration (Add new column)
2. Deploy code that reads NEW column (uses old as fallback)
3. Wait 1 deployment cycle (verify no issues)
4. Deploy code that WRITES to new column
5. Deploy migration to remove old column (if needed)

This "expand/contract" pattern has zero downtime.
```

---

## Environment Management

### Environment Tiers

| Tier | Branch | Database | URL |
|---|---|---|---|
| **Local dev** | any | Local PostgreSQL | localhost:3000 |
| **Staging** | `develop` | Neon branch | staging.empirex.app |
| **Production** | `main` | Neon production | empirex.app |

### Neon Database Branching for Staging

```bash
# Create staging branch from production (preserves data structure, not data)
# Neon Console → Branches → Create branch from main
# Name: staging
# Use connection string for staging Railway service

# Benefits:
# - Staging migrations tested before production
# - Production data structure mirrored
# - Staging can be reset any time
# - Cost: ~$0 extra (Neon branches are free)
```

### Secret Management

```
Local:     backend/.env (in .gitignore ✅)
Staging:   Railway environment variables (staging service)
Production: Railway environment variables (production service)

Never:
  ❌ Secrets in code
  ❌ Secrets in git history
  ❌ Secrets in Railway.toml
  ❌ Sharing secrets via email or chat
  
Always:
  ✅ Secrets in Railway env vars
  ✅ Document required secrets in docs/infrastructure/ENVIRONMENT_VARIABLES.md
  ✅ Rotate secrets on any suspected exposure
  ✅ Store master copies in 1Password or similar
```

---

## Feature Flag Deployment Pattern

```javascript
// Every new feature follows this pattern:

// Step 1: Ship code behind flag (OFF by default)
const enabled = await isEnabled('new_feature', req.user.id);
if (!enabled) return res.status(503).json({ error: 'Feature not available' });

// Step 2: Enable for internal team (test in production)
// backend/lib/featureFlags.js — add test user IDs to allowlist

// Step 3: Enable for 5% of users (canary)
// Monitor: error rate, performance, user feedback

// Step 4: Enable for 25% → 50% → 100%
// Each stage: monitor for 24–48 hours

// Step 5: Remove flag (clean up dead code)
// After 100% rollout is stable for 1+ week
```

---

## Rollback Procedures

### Code Rollback

```bash
# Option 1: Revert commit and push
git revert HEAD  # Creates new commit that undoes last commit
git push origin main
# Railway auto-deploys the revert

# Option 2: Railway Dashboard rollback
# Railway → Deployments → Select previous successful deployment → Redeploy
# Time: < 2 minutes

# Option 3: Force-push (emergency only, discuss with team)
git reset --hard HEAD~1
git push --force origin main
```

### Database Rollback

```bash
# For migrations that break things:
# IMPORTANT: Always write a rollback in the migration comment

# Example reverse migration:
node -e "
const pool = require('./db/pool');
pool.query('ALTER TABLE users DROP COLUMN IF NOT EXISTS new_column')
  .then(() => console.log('Rolled back'))
  .finally(() => pool.end());
"

# Or use Neon point-in-time recovery (recommended for data issues)
```

### Feature Flag Rollback (Fastest)

```bash
# Disable a broken feature in < 5 minutes without deploying:
# Railway Dashboard → Environment Variables → FF_BROKEN_FEATURE=false
# Effect: immediate (feature flag reads from process.env each request)
```

---

## CI Performance Optimizations

### Current CI Time: ~5–7 minutes

**Speed up with caching:**
```yaml
# Cache node_modules between runs:
- uses: actions/cache@v3
  with:
    path: |
      backend/node_modules
      frontend-next/node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

**Run backend and frontend CI in parallel (already done ✅)**

**Target CI time:** < 3 minutes (with caching)

---

## Pre-commit Hooks

```bash
# Install husky for pre-commit hooks:
cd backend && npm install --save-dev husky lint-staged
npx husky install

# .husky/pre-commit:
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

cd backend && npx lint-staged
cd frontend-next && npx lint-staged

# backend/package.json:
"lint-staged": {
  "**/*.js": ["eslint --fix", "git add"],
  "**/*.test.js": ["jest --testPathPattern"]
}

# frontend-next/package.json:
"lint-staged": {
  "**/*.{ts,tsx}": ["eslint --fix", "tsc --noEmit", "git add"]
}
```

**Blocks commit if:**
- ESLint errors present
- TypeScript errors present
- Failing tests related to changed files

---

## Deployment Notifications

```yaml
# Add to deploy.yml — notify on success and failure:

- name: Notify on success
  if: success()
  uses: appleboy/telegram-action@master
  with:
    to: ${{ secrets.TELEGRAM_CHAT_ID }}
    token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    message: |
      ✅ Empire X deployed successfully
      Branch: ${{ github.ref_name }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
      View: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}

- name: Notify on failure
  if: failure()
  uses: appleboy/telegram-action@master
  with:
    to: ${{ secrets.TELEGRAM_CHAT_ID }}
    token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    message: |
      ❌ Empire X deployment FAILED
      Branch: ${{ github.ref_name }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
      Logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```
