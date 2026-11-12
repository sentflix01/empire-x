# Re-audit notes 2026-11-11 (base main 5051b36 + PR #196 bc3632a)
## Phase 1
- endpoints 372 (none 38, optional 37, auth 254, admin 43); +20 new since 11-05, -2 removed (log-report).
- frontend calls: 223 paths, 0 missing routes (was 16). 4 "unmatched" are dynamic and resolve.
- 73 page routes.
- F-new A: maps load leaflet CSS from unpkg (no SRI) and pin PNGs from raw.githubusercontent.com/pointhi/... master (third-party repo, mutable branch). CSP style-src allows unpkg. NearbyMap.tsx:52-95, HomeMapTab.tsx:49-86, lib/csp.ts:27. Privacy: visitor IP to unpkg/GitHub; not in policy?
- F-new B: landing footer (app/landing/page.tsx:319-329) no Terms/Privacy/Cookie/Accessibility/Contact links; legal only from login/register/settings.
- Pre-consent: 0 third-party requests/cookies on 6 public pages (positive holds). Guest localStorage: empire_lang, page_guide flag, ai_history:guest.
- security.txt: Contact gmail + Expires 2027-11-02; no Policy/Canonical (optional). Contact is a gmail address (trust).
- Legal identity: registration pending; POLICIES_UPDATED 'October 2026' (month only).
## Phase 2
- two-account 9/9, order-journey 24/24, account-lifecycle 10/10 (was 9/10) — evidence/reaudit-2026-11-11/*.txt
- new-endpoints probe (scripts/reaudit-new-endpoints.mjs, evidence new-endpoints.json): authz OK on saves/my-products (no saver identity), verification docs (404 same for missing/not-yours), private-files (404 w/o signature, traversal 404), MFA (401 guest), devops new routes (403 member). 422 statuses fine.
- F-new C (Medium): no length limits: product title+description 900,000 chars stored (POST /api/products routes/products.ts:342; batch path caps 200 at :285); post, comment, business_name 500,000 chars stored (201). express.json limit 10mb (index.ts:268). API4:2023, ASVS V1/V2 input validation.
- F-new D (Low): 500 instead of 400/422: price 1e10 (NUMERIC(12,2) overflow), stock 2^31 (int overflow) on POST /api/products; saves toggle malformed target_id 500 (routes/saves.ts:64-77 no uuid check); two simultaneous toggles -> one 500 (check-then-insert vs UNIQUE(user_id,target_id)). A10:2025; regression class of F-034.
## Phase 3/4/13
- axe 4.12.1 on 50 pages (+3 dynamic) light & dark: 40/41 clean; 0 reflow at 320. evidence a11y-light.json, a11y-dark.json, a11y-dynamic-*.json
- F-new E (Medium, a11y): signed-in pages not covered by CI axe: Analytics nested unnamed pencil button inside Link (BusinessAnalytics.tsx:464-468; 10 button-name + 10 link-name), Referral copy buttons unnamed (Referral.tsx:171,184) + link input unlabeled (:179), Inventory unnamed disabled icon button; contrast: text-white/70-90 on gradient cards (Wallet .mb-1 + currency, Referral steps text-white/90 :158, Privacy text-white/75/85, Inventory text-primary/70, Analytics text-muted-foreground/80), showroom guest header pills border-white/40 bg-white/10; target-size: PostCard business link 10px (PostCard.tsx:841), rating stars (ReviewsSection.tsx:49). WCAG 4.1.2, 2.4.4, 1.3.1/3.3.2, 1.4.3, 2.5.8.
- F-new F (Medium): two floating buttons (page guide + AI) flip forever (globals.css:300-411 ai-coin-flip 4.8s infinite; pg-flip-coin) on every page; no pause (reduced motion OK). WCAG 2.2.2. Also FABs cover content/composer send at 375/768 (AiAssistant.tsx:511-545; bottom 10.5rem/6rem right 5) WCAG 2.4.11 risk; screenshots feed/analytics/showroom 375.
- F-new G (Low): Analytics header at 375 clips "Google Sheets" button (overflow 12px) and title squeezes; feed long unbroken text overflows 6px at 375 (no overflow-wrap).
- F-new H (Low): Product page sends PUT /api/products/:id {view_count} from client on every visit (ProductDetail.tsx:81) -> 400 for owner/403 others, console error; server already counts in GET (products.ts:337) incl. owner self-views & refreshes -> analytics "Product views" inflated.
- F-new I (Low): POST/PUT /api/showrooms with sections as JSON array passes validation (builderSectionRequirements.js normalizeSections accepts arrays) but stored as Postgres array literal in TEXT column -> site renders no sections. Web UI stringifies so users unaffected; API contract/data integrity.
- polish notes: product detail single-column at 1440, price "850.00" + ETB wrap (no formatAmount), marketplace "100 ETB"; raw status "published" lowercase pill; theme defaultTheme light ignores OS dark (providers.tsx:42); splash reappears per new tab (sessionStorage); serif display font on headings vs sans elsewhere.
- keyboard: focus visible on all; skip link/landmarks/h1 OK 9 pages; dark/reduced motion/forced colours OK; no first-visit tours. splash 3.3s first/0.9s reload (throttled) matches baseline.
## Phase 5/6
- npm audit prod deps: backend 0, frontend 0 (dev: backend 4 low/16 moderate, frontend 10 moderate).
- history secret scan 179 commits: 12 db-url hits, all placeholders/test values (verified without printing). Client bundle grep: no secret patterns.
- prod-verify 23/23 PASS. Prod headers strong (HSTS preload, nonce CSP strict-dynamic, XFO DENY, nosniff, referrer, permissions). F-new L (Low): prod CSP img-src includes http://localhost:3001 http://localhost:3002 (lib/csp.ts:30); style-src unsafe-inline + unpkg/cdnjs.
- F-new J (Medium, counsel): Privacy/Cookie policy (views/ServiceAgreement.tsx) omits Resend (email), Upstash Redis, Telegram, unpkg/GitHub map assets; Cookie policy has 0 mentions of local storage though app stores language, theme, page guide, AI chat history, chat drafts, builder drafts; no reference to Ethiopia Proclamation 1321/2024. GDPR Art 13(1)(e), ePrivacy 5(3), Ethiopia 1321/2024 transparency.
- F-new K (Low): per-user browser data not cleared on logout (AuthContext.tsx:158-172): AI chat history (AiAssistant.tsx:143,162 key per user id), chat drafts (Composer.tsx:15 key per conversation), builder drafts (ShowroomCreate.tsx:156). Shared devices. GDPR Art 25/32.
- AI prompt-injection: UNVERIFIED (no AI provider locally).
## Phase 7
- Lighthouse 12.8.2 prod mobile (simulated, via sandbox proxy): landing perf 86 LCP 3.2s TBT 310 CLS 0.048 589KB; marketplace 89 LCP 2.4 TBT 300 CLS 0.091 486KB; login 91 LCP 2.7 TBT 250 CLS 0 543KB. a11y 96/98/100, BP 96, SEO 100. landing LCP element = page-guide description (guide auto-open). marketplace heading-order h3.
- F-new M (Medium, owner decision conflict): production /api/flags/page-guided-tours enabled_for_user:true (GET, 2026-11-11) -> guide overlay auto-opens for first-time visitors on /landing and /marketplace (desktop + Pixel 7), contradicting DECISIONS.md 2026-11-06 (F-031: off by default; backend/lib/featureFlags.ts:44 default false). Env FF_PAGE_GUIDED_TOURS or Redis override on prod. Locally off.
- Load (local, 15s): health 2.5-2.9k rps; businesses ~1.1k; trending ~710; products list 45-58 rps p50 4.4s @200 because list = 2.2MB (one member's 900k-char product). After hiding those rows: 741-831 rps p50 13-245ms (baseline 11-05: 1026-1151 rps, p50 9-177) -> ~25-30% slower (observation). Escalates F-new C to High.
- Postgres "word is too long to be indexed" notices on full-text index for long titles.
