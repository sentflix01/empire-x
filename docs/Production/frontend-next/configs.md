# Config Files Grouped

## 1. What is this?

**Documentation page.** 

## 2. Why does it exist?

Explained below so anyone can understand this part of the system without reading code.

## 3. What does it do?

| File | Purpose |
|---|---|
| `vitest.config.mts` | jsdom env, globals, setup file, excludes e2e/ |
| `playwright.config.ts` | E2E: two webServers (backend tsx watch :3001 health-gated, Next dev :3000), reuseExistingServer locally, chromium project, trace-on-failure |
| `tailwind.config.js` + `globals.css` | Design tokens: brand purple primary, amber accent (--f59e0b), dark mode variants, 44px touch targets on mobile, legacy .bg-empire-gradient alias |
| `.env.local` | NEXT_PUBLIC_* only (API base URL, Stripe pk, Google client id, Sentry DSN placeholder) - all public-by-design |

## 4. What does it touch?

**Files referenced:**
- `vitest.config.mts`
- `playwright.config.ts`
- `tailwind.config.js`
- `globals.css`
