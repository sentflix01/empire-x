# Config Files Grouped
| File | Purpose |
|---|---|
| `vitest.config.ts` | jsdom env, globals, setup file, excludes e2e/ |
| `playwright.config.ts` | E2E: two webServers (backend tsx watch :3001 health-gated, Next dev :3000), reuseExistingServer locally, chromium project, trace-on-failure |
| `tailwind.config.js` + `globals.css` | Design tokens: brand purple primary, amber accent (--f59e0b), dark mode variants, 44px touch targets on mobile, legacy .bg-empire-gradient alias |
| `.env.local` | NEXT_PUBLIC_* only (API base URL, Stripe pk, Google client id, Sentry DSN placeholder) - all public-by-design |
