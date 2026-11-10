# Performance and UX audit — 2026-11-09

Non-authoritative work note (see `note/README.md`). Follows the 2026-11-05
international audit (F-045 fixed the intro video and splash). Everything here
was measured on the local stack; nothing touched a hosted service.

## 1. Architecture in one page

| Layer | What is there |
|---|---|
| Frontend | Next.js 16.4 (App Router, Turbopack build), React 19.3, Tailwind 4. Every route is dynamic (`ƒ`): `proxy.ts` sets a per-request CSP nonce (audit F-016), so pages cannot be served from a static cache. Pages are thin server shells around large client views (`views/*.tsx`); data is fetched in the browser with axios (`api/client.ts`, silent refresh on 401). Global client providers: i18next (4 locales bundled), next-themes, AuthContext, CartContext, React Query, sonner. |
| Backend | Express 5 + TypeScript (`tsx`), `pg` pool (max 5, 10 s statement timeout), Redis (ioredis) for response caching of **signed-in** traffic only — guests and Demo bypass Redis by design (`middleware/auth.ts` `withoutRedis`, Upstash quota). Socket.IO for chat/notifications, BullMQ workers off by default. Compression, strong ETags, Helmet, in-memory rate limits. |
| Data | PostgreSQL; numbered idempotent migrations with a ledger (`db/migrate-all.js`). |
| Hosting | Vercel (frontend), Render (API), Supabase/R2 storage, Upstash Redis (`docs/operations/DEPLOYMENT.md`). |

Main flows: landing → register/login → feed (business/personal) → marketplace → product → cart/checkout → orders; businesses and showrooms (public mini-sites); messages; notifications; analytics for sellers.

## 2. How it was measured

- **Lighthouse 12.8.2**, mobile preset (simulated Moto G Power, 4× CPU, 150 ms RTT, 1.6 Mbps), **median of 3 runs**, against `next build && next start` (production) on this 4-vCPU sandbox. Signed-in pages: Playwright signs in, Lighthouse then loads the page cold (storage reset, cookies kept). Scripts: see §6.
- **Bundle**: `next analyze --output` + `next analyze export`; first-load JS per route = the `bootstrap` + `render_dependent` chunks (compressed sizes from the analyzer).
- **API**: a preload that counts SQL queries and DB time per request (a second backend instance on :3101), and autocannon 8 (10 s per endpoint, 10 and 50 connections) against the normal dev backend. Rate limiting is off in development, so this is raw server capacity.
- **Data**: `seed.js` + `seed-showrooms.js` (50 users, 151 businesses, 50 showrooms, 202 products, 50 posts), made visible to Real mode locally (cleared `is_seed`, paid plan, showrooms linked to a business). Picsum is blocked here, so photos were replaced by local 2000×2000 JPEGs of about 1 MB — the size of a typical unresized phone upload, which is what the app stores today (TD-009). For the database tests the data was then scaled to 50.7k products, 50k posts and 20k notifications.

**Not measurable here:** field Core Web Vitals (no RUM), real TTFB from Vercel/Render, CDN behaviour, and the Vercel image optimizer itself (locally Next refuses to optimize `localhost` images — SSRF protection — so optimized-image gains are measured separately, see §5).

## 3. Baseline

### Lighthouse (mobile, median of 3)

| Page | Perf | A11y | BP | SEO | FCP s | LCP s | TBT ms | CLS | Transfer |
|---|---|---|---|---|---|---|---|---|---|
| /landing | 92 | 95 | 100 | 100 | 1.2 | 3.3 | 45 | 0 | 509 KB |
| /login | 92 | 100 | 100 | 100 | 1.1 | 3.3 | 50 | 0.009 | 470 KB |
| /register | 94 | 100 | 100 | 100 | 1.1 | 3.1 | 85 | 0 | 471 KB |
| /feed (guest) | **50** | 99 | 96 | 100 | 1.1 | **10.7** | **1384** | 0 | **11.8 MB** |
| /marketplace | 75 | 98 | 100 | 100 | 1.1 | 6.0 | 229 | 0 | **15.4 MB** |
| /businesses | 71 | 100 | 96 | 100 | 1.1 | 3.0 | 256 | **0.527** | 494 KB |
| /showrooms | 68 | 98 | 100 | 100 | 1.1 | **24.0** | 316 | 0 | **13.6 MB** |
| /explore | 72 | 96 | 96 | 100 | 1.1 | 3.0 | 277 | **0.350** | 7.6 MB |
| /showroom/[slug] | 91 | 95 | 96 | 100 | 1.1 | 3.5 | 63 | 0 | 535 KB |
| /products/[id] | 80 | 100 | 96 | 100 | 1.1 | 5.1 | 126 | 0 | 2.3 MB |
| /feed (signed in) | 77 | 96 | 96 | 100 | 1.1 | 2.3 | 785 | 0.001 | 725 KB |
| /orders (signed in) | 76 | 100 | 96 | 100 | 1.1 | 3.7 | 631 | 0.001 | 690 KB |
| /messages (signed in) | 80 | 100 | 100 | 100 | 1.1 | 3.0 | 582 | 0.001 | 527 KB |

TTFB was 7–17 ms for every page locally (not representative of production).
On the landing page the browser actually painted the LCP text at 227 ms; Lighthouse's
simulated 3.3 s comes from the ~330 KB of script requested before that paint.

### First-load JS (compressed, from the analyzer)

Shared by every route: ~285 KB (Next.js + React 172 KB, axios 24 KB, i18n ~36 KB
including the Amharic file 8 KB, sonner 9 KB, React Query 9 KB, tailwind-merge 8 KB).
Heaviest routes: /profile 565 KB, /orders 557 KB (jsPDF + pako + fflate ≈ 125 KB),
/p/[username] 550, /analytics 543, /explore 532 (framer-motion + motion-dom ≈ 62 KB
on profile, orders, explore and the feed's lazy chunk).

### API (cold cache, one request each)

All 34 main endpoints used 0–4 SQL queries (no N+1) and answered in ≤ 12 ms on the
small dataset. At 50k products: `GET /api/products` took 44 ms warm / 2.0 s cold
and `GET /api/trending` 40 ms — both a parallel sequential scan plus an **on-disk
sort (~24 MB)** of every public product to return 24 (or 8) rows.

### API load (autocannon, 50.7k products, guests)

| Endpoint | c=10 p95 | c=50 p95 | c=50 req/s |
|---|---|---|---|
| products list | 348 ms | 1291 ms | 42 |
| products, deep cursor | 354 ms | 2046 ms | 38 |
| products search (uncached) | 354 ms | 1438 ms | 38 |
| trending | 249 ms | 979 ms | 55 |
| products sort -price | 17 ms | 64 ms | 973 |
| product detail | 11 ms | 52 ms | 1162 |
| posts feed | 17 ms | 67 ms | 982 |
| businesses | 19 ms | 90 ms | 685 |
| showrooms | 27 ms | 119 ms | 543 |

### Quality gates (before)

Frontend lint, `tsc`, strict typecheck and 588 Vitest tests passed; backend
typecheck and 763 Jest tests passed. `npm run test:db`: 318/320 — the two
failures were "sorry, too many clients already" (see P22); the suite passes alone.
`npm audit --omit=dev`: 0 vulnerabilities in both packages (10 + 20 moderate/low,
all in eslint/jest dev tooling).

## 4. Findings (prioritised)

Impact is on the measured pages above. Effort: S < 1 h, M < 1 day, L > 1 day.

| # | Issue | Location | Impact | Estimated gain | Effort |
|---|---|---|---|---|---|
| P1 | Product, showroom, post and business photos are rendered with `unoptimized` (or a raw `<img>`), so phones download the original upload (≈1 MB each, 2000 px) for 150–300 px cards. LCP image is also `loading="lazy"`. | `components/marketplace/ProductCard.tsx:36`, `components/ui/SafeImage.tsx:52` (`fill={false}` path), `views/ProductDetail.tsx:181,197`, `views/Search.tsx:336`, `views/NearbyMap.tsx:465`, feed/business cards | **High** | 11–15 MB → well under 1 MB on feed, marketplace, showrooms; LCP −3 to −20 s on those pages | M |
| P2 | No index serves the public product list order or trending order: seq scan + external merge sort of every public product per request; guests bypass Redis so every guest hits it | `backend/routes/products.ts:162`, `backend/routes/trending.ts:33` | **High** | 44 ms → <1 ms per query; p95 at c=50 1.3–2.0 s → tens of ms | S |
| P3 | Businesses page: one `/api/profiles/by-user/:id` request per owner (client-side N+1, ~25 requests), whole page held in skeletons until all finish; redundant `/api/auth/me`; guests call a guaranteed-401 follows endpoint; guest-only-empty sections show 3 skeletons then collapse | `views/Businesses.tsx:232-330,164` | **High** (CLS 0.53) | CLS → ~0; 25 requests → 1 | M |
| P4 | Feed wraps every post in a framer-motion fade starting at opacity 0; framer-motion + motion-dom ≈ 62 KB on feed, explore, profile, orders | `views/Home.tsx:12,391`, `components/feed/PostCard.tsx:15,1345`, `views/Orders.tsx:18`, `views/Profile.tsx:12` | Med | −45–60 KB JS on those routes, less main-thread work | M |
| P5 | jsPDF (+ pako, fflate ≈ 125 KB) is bundled into /orders and the receipt page although it only runs when someone clicks "Download" | `views/Orders.tsx:17`, `views/SubscriptionReceipt.tsx:11` | Med | −125 KB first-load JS on /orders | S |
| P6 | Explore inserts the hashtag section above the posts when its request finishes after trending → layout shift | `views/Explore.tsx:45-48` | Med (CLS 0.35) | CLS → ~0 | S |
| P7 | Product page shows a spinner until 4 sequential requests finish (product → wishlist → alerts → seller); signed-in users fetch wishlist + alerts twice; client sends a `PUT` view-count update that the server already does on GET (403 for visitors, double count for owners) | `views/ProductDetail.tsx:56-82,95` | Med | −3 round trips before content; −2 to −3 requests | S |
| P8 | Signed-in "cache warm" fires `/api/trending/warm` (same cache key as the `/api/trending` call next to it) and `/api/posts?limit=10` (a cache key nothing reads) on every first app load; messages badge loads its count twice at start | `components/layout/AppLayout.tsx:326-328`, `lib/useMessagesBadge.ts:43` | Low | −2 to −3 requests competing with the page's own | S |
| P9 | Product detail `GET` awaits the `view_count` UPDATE before responding | `backend/routes/products.ts:337` | Low | lower p95 under row contention | S |
| P10 | Landing hero: three 12 px labels fail contrast (white/70 on blue/green/violet) | `app/landing/page.tsx:263-273` | Low (A11y 95) | A11y 95 → 100 | S |
| P11 | 14 sets of exact duplicate indexes (e.g. `idx_profiles_user_id`/`idx_user_profiles_user_id`, three identical `messages(conversation_id, created_at)`) | live schema | Low | less write amplification / storage | S (migration) |
| P12 | Render-blocking 25 KB CSS file (Lighthouse est. 460 ms); `experimental.inlineCss` exists | `next.config.ts` | Low–Med (lab) | FCP/LCP in lab; to be tested | S, experimental |
| P13 | All 4 locales (Amharic 8 KB) in the shared bundle | `lib/i18n.ts:17-20` | Low | −8 KB per page | S, but Amharic users would see English briefly — **not done**, Amharic is a primary market |
| P14 | axios (24 KB) in the shared bundle where `fetch` would do | `api/client.ts` | Low–Med | −24 KB every page | L (interceptors, refresh, 100+ call sites) — recommended later |
| P15 | 223 uses of 10 px text and 7 px labels on the assistant buttons (Lighthouse "legible font sizes" fails on app pages) | `components/AiAssistant.tsx:103,121`, `components/layout/AppLayout.tsx` | Low | BP 96 → 100 | design decision — reported only |
| P16 | `/api/showrooms` list returns full `sections` JSON (125 KB raw / 23 KB gzip for 50) — the feed does use it for Spotlight | `backend/routes/showrooms.ts:21` | Low | ~20 KB per feed load | M (API contract) — recommended later |
| P17 | Every page is dynamically rendered because of the CSP nonce, so no page is CDN-cacheable | `proxy.ts` | Info | TTFB in production | security decision (F-016) — kept |

Found while verifying (added to the list and fixed, except where noted):

| # | Issue | Location | Impact | Effort |
|---|---|---|---|---|
| P18 | Global business feed (guest /feed): one profile request per owner (up to 50), nothing shown until all answer, then all 50 cards rendered at once (TBT ≈1 s) | `components/feed/BusinessShowroomFeed.tsx` | High | M |
| P19 | Product search `ILIKE '%term%'` walks every product for rare terms (61 ms; search p95 332 ms at c=50 after P2) | `backend/routes/products.ts:153` | Med | S |
| P20 | Public showroom: visitor bar inserted above the page after the sign-in check (CLS 0.051–0.133, varies per run) | `components/showroom/QrVisitorActions.tsx` | Med | S |
| P21 | Guest feed requests `/api/stories` (members only → 401) and then a token refresh (another 401) | `views/Stories.tsx:134` | Low | S |
| P22 | `test:db` leaks pools per test file; connections reach ~100 and late files fail at random | `backend/test/db/setup.js` | Med (CI trust) | S |

Found in passing (not performance, reported separately): guests skip the paid-plan
filter on `GET /api/products` because `seller_id !== req.user?.id` is
`undefined !== undefined`; the showrooms list shows sites whose detail page 404s
when the site has no `business_id`; `npm run seed:showrooms` fails under plain
`node` (requires a `.ts` module).

## 5. Changes and results

Branch `claude/laughing-bardeen-76gay4`, one commit per change.

| Finding | Change | Commit |
|---|---|---|
| P2 | `migrate89`: partial indexes for newest-first and most-viewed public products | `perf(db): index the public product list and trending order` |
| P19 | `migrate90`: trigram GIN indexes for product search | `perf(db): trigram indexes for product search` |
| P1 | `canOptimizeImage` + `sizes`/eager first image; `SafeImage`, product cards, covers, avatars | `perf(images): resize photos with next/image…` |
| P3 | Businesses: auth from context, one batched profile request, cards before owners, no guest placeholders | `perf(businesses): …` + `feat(profiles): fetch several owners' profiles in one request` |
| P18 | Business feed: cards first, batched owners, six cards at a time | `perf(feed): business feed shows cards first…` |
| P4 | Feed post entrance in CSS; profile peek loaded on first open | `perf(feed): CSS entrance…` (+ two follow-up fixes found by `check:css`) |
| P5 | jsPDF loaded on click | `perf(orders): load jsPDF only when…` |
| P6, P20 | Explore renders once both requests answer; visitor bar in first HTML | `fix(explore): …`, `fix(showroom): …` |
| P7, P8, P9, P21 | Product page shows first; duplicate start-up requests removed; view count not awaited; no guest stories request | several `perf(…)` commits |
| P10 | Landing tile labels at 4.8–5.5:1 contrast | `fix(a11y): readable labels…` |
| P22 | `DB_IDLE_TIMEOUT_MS`, 200 ms in DB tests | `test(db): release each test file's connections…` |
| — | Playwright script budgets (landing 300, marketplace 340, feed 450, explore 445 KB) | `test(e2e): script budgets…` |

Not changed, with reason: P11 duplicate indexes (a few KB each at current
size; a migration that drops indexes is better done with production sizes in
hand), P12 `inlineCss` (measured worse, below), P13 lazy locales (Amharic users
would see English first), P14 axios → fetch, P15 font sizes (design decision),
P16 showroom list payload (API contract), P17 CSP nonce (security decision).

### Lighthouse, before → after (mobile, median of 3)

Both columns measured the same way: a production build with the image optimizer
allowed to read the local uploads (`images.dangerouslyAllowLocalIP`, measurement
build only, never committed), so photos behave as they will on HTTPS storage.
Before = commit `08ccf3a`; after = this branch.

| Page | Perf | A11y | BP | SEO | LCP s | TBT ms | CLS | JS KB | Transfer |
|---|---|---|---|---|---|---|---|---|---|
| /landing | 92 → **92** | 95 → 100 | 100 → 100 | 100 → 100 | 3.4 → 3.4 | 54 → 28 | 0.000 → 0.000 | 331 → 332 | 510 KB → 511 KB |
| /login | 93 → **93** | 100 → 100 | 100 → 100 | 100 → 100 | 3.3 → 3.3 | 36 → 36 | 0.009 → 0.009 | 295 → 295 | 470 KB → 470 KB |
| /register | 93 → **96** | 100 → 100 | 100 → 100 | 100 → 100 | 3.3 → 2.8 | 26 → 31 | 0.000 → 0.000 | 298 → 298 | 470 KB → 471 KB |
| /feed (guest) | 53 → **71** | 99 → 99 | 96 → 100 | 100 → 100 | 10.6 → 5.8 | 1008 → 355 | 0.000 → 0.000 | 486 → 440 | 11.5 MB → 680 KB |
| /marketplace | 71 → **82** | 98 → 98 | 100 → 100 | 100 → 100 | 40.3 → 4.0 | 240 → 262 | 0.000 → 0.000 | 328 → 329 | 15.5 MB → 540 KB |
| /businesses | 73 → **95** | 100 → 100 | 96 → 100 | 100 → 100 | 2.9 → 2.8 | 129 → 132 | 0.527 → 0.000 | 327 → 328 | 492 KB → 483 KB |
| /showrooms | 75 → **81** | 98 → 98 | 100 → 100 | 100 → 100 | 5.9 → 4.2 | 216 → 247 | 0.000 → 0.000 | 330 → 330 | 13.3 MB → 619 KB |
| /explore | 73 → **69** | 96 → 96 | 100 → 100 | 100 → 100 | 6.0 → 5.0 | 260 → 523 | 0.000 → 0.000 | 479 → 432 | 8.4 MB → 676 KB |
| /showroom/[slug] | 88 → **89** | 96 → 96 | 100 → 100 | 100 → 100 | 3.8 → 3.6 | 47 → 66 | 0.051 → 0.000 | 367 → 366 | 2.4 MB → 905 KB |
| /products/[id] | 82 → **86** | 100 → 100 | 96 → 100 | 100 → 100 | 5.0 → 3.9 | 59 → 134 | 0.000 → 0.002 | 336 → 337 | 2.2 MB → 495 KB |
| /feed (signed in) | 82 → **83** | 96 → 96 | 100 → 100 | 100 → 100 | 3.0 → 2.7 | 531 → 531 | 0.001 → 0.001 | 486 → 440 | 766 KB → 716 KB |
| /orders (signed in) | 82 → **87** | 100 → 100 | 96 → 96 | 100 → 100 | 3.9 → 3.5 | 319 → 212 | 0.001 → 0.001 | 518 → 386 | 690 KB → 554 KB |
| /messages (signed in) | 85 → **90** | 100 → 100 | 100 → 100 | 100 → 100 | 3.4 → 2.5 | 309 → 337 | 0.001 → 0.001 | 348 → 349 | 527 KB → 523 KB |

Caveats:
- The stand-in photos compress unusually well in AVIF (2 KB at 384 px wide), so
  real photos will be heavier after optimisation than these "after" bytes;
  the direction and the layout/LCP effects hold.
- TBT varies run to run on this sandbox (e.g. /messages 138–482 ms over three
  runs). On /explore and /products/[id] TBT rose although total main-thread work
  stayed the same (Explore script time 1485 → 1401 ms, product 883 → 931 ms):
  data and images now arrive about 1.5 s sooner, so the same React rendering
  falls inside Lighthouse's blocking window. The cost is the rendering itself
  (PostCard, 1,300 lines), listed under next steps.
- Without the optimizer (plain local dev), local `http://localhost` uploads
  stay unoptimized by design, so local numbers show full-size photos.

`experimental.inlineCss` (A/B on the same code, 3 runs each): landing LCP
3.27 → 3.47 s, login 3.27 → 3.61 s, about +50 KB of HTML per page. Rejected.

### First-load JavaScript (compressed, analyzer)

| Route | Before | After |
|---|---|---|
| /orders | 556.6 KB | 424.2 KB |
| /business/subscription/receipt/[id] | 475.2 KB | 342.1 KB |
| /explore, /hashtag/[name] | 532.0 / 530.9 KB | 465.4 / 464.3 KB |
| /landing, /login, /marketplace | 294.8 / 303.9 / 344.4 KB | unchanged |
| /feed (incl. its lazy view, Playwright, until idle) | 464 KB | 418 KB |

### API (50.7k products, guests, autocannon 10 s)

| Endpoint | p95 c=10 | p95 c=50 | req/s c=50 |
|---|---|---|---|
| products list | 348 → 14 ms | 1291 → 57 ms | 42 → 1247 |
| products, deep cursor | 354 → 13 ms | 2046 → 54 ms | 38 → 1180 |
| products search (uncached) | 354 → 24 ms | 1438 → 83 ms | 38 → 789 |
| trending | 249 → 15 ms | 979 → 70 ms | 55 → 903 |
| product detail | 11 → 10 ms | 52 → 54 ms | 1162 → 1354 |
| posts feed | 17 → 14 ms | 67 → 57 ms | 982 → 1150 |
| businesses | 19 → 17 ms | 90 → 78 ms | 685 → 845 |
| showrooms | 27 → 22 ms | 119 → 101 ms | 543 → 647 |

Every measured endpoint is under 300 ms p95 at 50 connections. Queries per
request stayed at 0–4 (no N+1 on the server); the two client-side N+1 patterns
(P3, P18) now use one batched request. Raw numbers are an upper bound: 4 local
vCPUs, local Postgres, rate limiting off in development; production runs on
Render's free plan.

### Quality gates after

| Check | Result |
|---|---|
| Frontend lint, `tsc`, strict typecheck | pass |
| Vitest | 606 / 606 (89 files) |
| `next build` + `check:css` | pass (the guard caught two missing utilities during this work) |
| Backend typecheck, Jest | pass, 763 / 763 |
| `npm run test:db` (fresh database, all migrations) | 40 / 40 suites, 328 / 328, twice; at most 8 connections |
| Playwright Chromium journeys | 90 passed, 2 skipped (with CI's Google client placeholder) |
| `npm audit --omit=dev` | 0 vulnerabilities (both packages) |

## 6. Targets

| Target | Status |
|---|---|
| LCP < 2.5 s (lab, mobile) | **Not met** on any page in Lighthouse's simulated profile (best 2.5–2.8 s: /messages, signed-in /feed, /register). On /landing the browser paints the LCP text at 0.23 s; the simulated 3.3 s comes from ~300 KB of script requested before the paint. Field LCP is unknown (no RUM). |
| INP < 200 ms | Not measurable in the lab. TBT, its proxy, is under 200 ms on 5 of 13 pages (landing, login, register, showroom, product); the feeds, explore, marketplace, orders and messages render heavy client components. |
| CLS < 0.1 | **Met** on all 13 pages (was 0.527 on /businesses and up to 0.133 on /showroom). |
| TTFB < 800 ms | Met locally (7–30 ms); production is Render's free plan with cold starts (F-030) and was not measured. |
| Performance 90+ | Met on landing, login, register, businesses, messages; not on feed, marketplace, showrooms, explore, showroom, product, orders. |
| Accessibility 95+ | Met on 13 / 13 (landing 95 → 100). |
| Best Practices 95+ | Met on 13 / 13 (several 96 → 100). |
| SEO 95+ | Met on 13 / 13. |
| API p95 < 300 ms, no N+1 | Met for every measured endpoint. |

What reaching 90+ and LCP < 2.5 s on the app pages needs: less JavaScript
before first paint and less client rendering. These pages are client-rendered
views: the browser downloads ~300–440 KB of script, then fetches data, then
renders. Server-rendering the first screen of the feed, marketplace and
showrooms (React Server Components with the data fetched on the server) is the
one change that moves LCP substantially; it is an L-sized change per page.

## 7. Recommended next steps

1. **RUM**: report Core Web Vitals from real phones (`web-vitals` → the existing
   error feed or Sentry), split by page and network. Only field data can answer
   the LCP/INP targets.
2. **Watch Vercel image usage** after deploy (open decision in
   `project-brain/DECISIONS.md`); if the quota is tight, resize on upload with
   `sharp` (TD-009) so originals are never stored at full size.
3. **Server-render the first screen** of /feed, /marketplace and /showrooms.
4. **PostCard** render cost: split the 1,300-line component and defer the menus,
   reactions and comment UI until used; consider `content-visibility: auto` on
   off-screen cards.
5. **Lighthouse CI budget** in GitHub Actions on landing/login/feed/marketplace
   (the Playwright script budgets added here guard bytes, not timings).
6. axios → `fetch` in `api/client.ts` (−24 KB on every page); framer-motion in
   /profile and /orders behind `LazyMotion` or CSS.
7. Production hosting: keep the API warm or move off the free plan (F-030), then
   measure TTFB from Ethiopia.
8. Drop the 14 duplicate indexes once production index sizes are checked.

## 8. Reproducing

Scripts in `scripts/` (local stack only; they refuse non-local targets where
they send requests):

| Script | What it does |
|---|---|
| `lh.mjs <outDir> <runs> [page…]` | Lighthouse 12.8.2 mobile, median of N; signed-in pages sign in with Playwright first (`E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` from the local stack's `env.sh`) |
| `qcount.cjs` | `node --require qcount.cjs --import tsx index.ts`: one JSON line per request with SQL query count and DB time (`QCOUNT_LOG`) |
| `sweep.mjs [base]` | Calls the main guest and signed-in endpoints once against the instrumented backend |
| `load.mjs <out.json> [seconds]` | autocannon at 10 and 50 connections on the main endpoints, including a deep cursor and uncached searches |
| `bundle.py graph.jsonl [route…]` | First-load JS per route from `next analyze export` |

The local data changes (seed users treated as Real, paid plans, showrooms
linked to businesses, photos replaced by local 2000×2000 JPEGs, data scaled to
50k products) were made only on the local database.
