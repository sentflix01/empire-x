# feat: personal/business toggle, Google OAuth popup, port 3002, Redis resilience

> **Type:** Feature · **Date:** 2026-09-17 · **Commit:** `9aa9ae1` · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Pushed — PR open

## 1. What was this task?

A multi-area delivery covering four distinct features and fixes:
1. **Personal / Business feed toggle** — sidebar accordion pills under Home and Profile tabs
2. **Google Sign-In rewrite** — pure OAuth2 popup flow with no GIS script dependency
3. **Frontend port migration** — 3000 → 3002 across all config, env, and source files
4. **Backend reliability** — Redis quota resilience, `showroomDoctor` build fix, PORT warning

## 2. Why does it exist?

**Personal / Business toggle:** Users needed a clear, persistent way to switch between their social feed (Personal) and business showroom directory (Business) without the toggle cluttering the feed filter bar. The pills now live in the sidebar exclusively, under their parent tab, only visible when that tab is active.

**Google OAuth rewrite:** The GIS (`accounts.google.com/gsi/client`) script was loaded on every page load, triggering `GET /gsi/status` which returned `403 origin not allowed` during Cloud Console propagation delays and in any unregistered localhost environment. Every prior approach (renderButton, prompt, FedCM disable, custom DOM button) still loaded the script. The solution removes GIS entirely.

**Port migration:** The frontend was on port 3000, conflicting with other local projects. Moved to 3002 across every file that referenced it.

**Redis resilience:** Upstash free-tier (500k requests/month) was exhausted in production, causing hundreds of `UNHANDLED REJECTION` log entries per minute and crashing background workers.

## 3. What was done?

- **43 files changed** (+934 / −662)

### Frontend — Personal / Business toggle

- `frontend-next/lib/ProfileViewContext.tsx` — split single `activeView` into two independent states: `homeFeedMode` (feed page) and `profileViewMode` (profile page), each with separate `sessionStorage` keys. Legacy aliases kept for backwards compat.
- `frontend-next/components/layout/AppLayout.tsx` — added `ViewTogglePill` as a top-level component (not inline, prevents framer-motion re-mount loop). Pills render under Home only when `isActive('/feed')` and under Profile only when `isActive('/profile')`.
- `frontend-next/components/profile/ProfileToggle.tsx` — added `layoutId` prop (default `"profile-pill"`) so multiple instances don't share the same framer-motion layout animation.
- `frontend-next/views/Home.tsx` — removed `ProfileToggle` from feed filter bar entirely; removed `feedFlipping` state and `handleFeedFlip`; filter bar is now `[For You] [Nearby] [Following] [Trending] [↺]` only.
- `frontend-next/views/Profile.tsx` — consumes `profileViewMode` / `setProfileViewMode` independently.
- `frontend-next/components/profile/PersonalProfile.tsx` — consumes `profileViewTokens` for tab accent colors.
- `frontend-next/views/Businesses.tsx` — fixed nested `<a>` inside `<a>` hydration error in `BusinessCard` (inner `<Link>` replaced with `<span>`).

### Frontend — Google Sign-In (no GIS script)

- `frontend-next/lib/googleAuth.ts` — full rewrite. Pure OAuth2 popup flow:
  1. Button click opens `accounts.google.com/o/oauth2/v2/auth?response_type=id_token`
  2. Google redirects popup to `/auth/google/callback#id_token=...`
  3. Callback page posts token via `BroadcastChannel` (COOP-safe, primary) + `window.postMessage` (fallback)
  4. `openGooglePopup()` resolves with id_token → sent to backend unchanged
  - `getClientId()` reads env at call time (not module load) for testability
  - 5-minute timeout; silent cancel on popup close
- `frontend-next/app/(auth)/auth/google/callback/page.tsx` — **new file**. Parses URL fragment, posts result, closes popup. Falls back to `window.location.replace('/')` if `window.close()` is blocked.
- `frontend-next/next.config.ts` — added per-route COOP header override: `Cross-Origin-Opener-Policy: unsafe-none` for `/auth/google/callback` so `window.opener` is accessible after Google's cross-origin redirect.
- `frontend-next/components/GoogleSignInInit.tsx` — now a true no-op (kept for import compat).
- `frontend-next/lib/AuthContext.tsx` — skips `ensureFreshToken` on auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify`, `/auth/google/callback`) to eliminate guaranteed-401 console noise.
- `frontend-next/api/client.ts` — 401 interceptor also skips refresh on auth pages; `localStorage` calls wrapped in `try/catch` for incognito/private-browsing safety.
- `frontend-next/views/Login.tsx`, `Register.tsx` — simplified: no polling loop needed since button renders synchronously.
- `frontend-next/test/googleAuth.test.ts` — 13 tests rewritten for popup architecture; `window.addEventListener` spy captures handler directly for deterministic async testing.

### Backend — reliability

- `backend/lib/redis.ts` — `client.on('error')` handler detects `max requests limit exceeded` and switches `redisInstance` to no-op, disconnects gracefully. `cached()` also catches and degrades.
- `backend/lib/errorCollector.ts` — `unhandledRejection` handler suppresses Redis quota errors (demotes to `warn`), preventing log flood.
- `backend/routes/auth.ts` — `getGoogleClient()` factory reads `GOOGLE_CLIENT_ID` at request time instead of module load, so env changes take effect after restart.
- `backend/scripts/showroom-digests.js` — dynamic imports wrapped in `try/catch`; returns `{ importError: true }` instead of crashing if `dist/lib/showroomDoctor.js` is missing.
- `backend/Dockerfile` — added post-build verification: `test -f dist/lib/showroomDoctor.js` fails the Docker build fast rather than deploying a broken image.
- `backend/index.ts` — logs a warning at startup when `PORT=3002` in production (indicates Render env misconfiguration).
- `backend/.env.production.example` — documents that `PORT` must NOT be set on Render.

### Port migration (3000 → 3002)

All references updated across: `docker-compose.yml`, `backend/.env`, `backend/.env.example`, `backend/lib/frontendUrl.ts`, `backend/socket.ts`, `backend/routes/orders.ts`, `backend/routes/wallet.ts`, `backend/test/e2e.test.js`, `frontend-next/package.json` (`next dev --port 3002`), `frontend-next/.env.example`, `frontend-next/next.config.ts`, `frontend-next/app/layout.tsx`, `frontend-next/app/robots.ts`, `frontend-next/app/sitemap.ts`, `frontend-next/playwright.config.ts`, `frontend-next/e2e/signup.spec.ts`, `frontend-next/README.md`.

### Docs

- `docs/product/ROADMAP.md` — marked Google OAuth popup flow, Personal/Business toggle, port migration, and Redis resilience as shipped (September 2026).
- `docs/ONBOARDING.md` — port 3002, added `ProfileViewContext`, `googleAuth.ts`, and callback page to key files table.
- `README.md` — status updated to September 2026; auth stack row updated.

## 4. Verification

- TypeScript: `npx tsc --noEmit --skipLibCheck` → **0 errors**
- googleAuth unit tests: **13/13 passing**
- Backend login `POST /api/auth/login` → **200 OK**, access token returned
- Backend health `GET /api/health` → `{ status: "ok", database: "connected" }`
- No stale `setActiveView` / `activeView` references remain in any source file
- No nested `<a>` hydration errors in Businesses page

---

*Log entry authored by Kiro — derived from commit `9aa9ae1` on branch `feat/personal-business-toggle-auth-port-fixes`.*
