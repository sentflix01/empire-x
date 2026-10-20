# Nodbusiness — Master Tour Prompt
## Stages 1–5: Coverage Report · Gap Report · Full Specification

---

## PART A: COVERAGE REPORT

### Route inventory (57 page.tsx files)

| # | Route | View file | Roles | Tour ID |
|---|-------|-----------|-------|---------|
| 1 | `/` | redirect only | all | — |
| 2 | `/landing` | `landing/page.tsx` (inline) | guest/all | TOUR-LANDING |
| 3 | `/login` | `views/Login.tsx` | guest | TOUR-LOGIN |
| 4 | `/register` | `views/Register.tsx` | guest | TOUR-REGISTER |
| 5 | `/onboarding` | `views/Onboarding.tsx` | new user | TOUR-ONBOARD |
| 6 | `/forgot-password` | `views/ForgotPassword.tsx` | guest | TOUR-FORGOT |
| 7 | `/reset-password` | `views/ResetPassword.tsx` | guest | TOUR-RESET |
| 8 | `/auth/google/callback` | callback page | guest | excluded — redirect only |
| 9 | `/choose-account` | `choose-account/page.tsx` | multi-account | TOUR-CHOOSE-ACCT |
| 10 | `/choose-mode` | `choose-mode/page.tsx` | demo/real | TOUR-CHOOSE-MODE |
| 11 | `/feed` | `views/Home.tsx` | auth+guest | TOUR-FEED |
| 12 | `/explore` | `views/Explore.tsx` | auth | TOUR-EXPLORE |
| 13 | `/search` | `views/Search.tsx` | auth+guest | TOUR-SEARCH |
| 14 | `/marketplace` | `views/Marketplace.tsx` | auth+guest | TOUR-MARKETPLACE |
| 15 | `/products/[id]` | `views/ProductDetail.tsx` | auth+guest | TOUR-PRODUCT-DETAIL |
| 16 | `/products/create` | `views/ProductCreate.tsx` | business owner | TOUR-PRODUCT-CREATE |
| 17 | `/products/edit` | `views/ProductCreate.tsx` (edit mode) | business owner | TOUR-PRODUCT-EDIT |
| 18 | `/products/scan` | `views/ProductQuickScan.tsx` | auth | TOUR-PRODUCT-SCAN |
| 19 | `/businesses` | `views/Businesses.tsx` | auth | TOUR-BUSINESSES |
| 20 | `/business/create` | `views/BusinessCreate.tsx` | auth | TOUR-BIZ-CREATE |
| 21 | `/business/edit` | `views/BusinessCreate.tsx` (edit) | business owner | TOUR-BIZ-EDIT |
| 22 | `/business/inventory` | `views/BusinessInventory.tsx` | business owner | TOUR-INVENTORY |
| 23 | `/business/subscription` | `views/BusinessSubscription.tsx` | business owner | TOUR-SUBSCRIPTION |
| 24 | `/business/subscription/receipt/[id]` | `views/SubscriptionReceipt.tsx` | business owner | TOUR-SUB-RECEIPT |
| 25 | `/business/subscription/return` | `views/SubscriptionReturn.tsx` | business owner | TOUR-SUB-RETURN |
| 26 | `/showrooms` (app) | `views/Showrooms.tsx` | auth+guest | TOUR-SHOWROOMS |
| 27 | `/showroom/create` | `views/ShowroomCreate.tsx` | business owner | TOUR-SHOWROOM-CREATE |
| 28 | `/showroom/samples` | `views/ShowroomWizard.tsx` | business owner | TOUR-SHOWROOM-SAMPLES |
| 29 | `/showroom/templates` | `views/ShowroomWizard.tsx` | business owner | TOUR-SHOWROOM-TEMPLATES |
| 30 | `/showroom/[slug]` (public) | `views/ShowroomView.tsx` | all | TOUR-SHOWROOM-VIEW |
| 31 | `/showrooms/[id]` (public) | `views/ShowroomView.tsx` | all | TOUR-SHOWROOM-VIEW |
| 32 | `/p/[username]` | `views/Profile.tsx` | all | TOUR-PROFILE-PUBLIC |
| 33 | `/profile` | `views/Profile.tsx` | auth | TOUR-PROFILE-OWN |
| 34 | `/profile/[id]` | `views/Profile.tsx` | auth | TOUR-PROFILE-OTHER |
| 35 | `/profile/edit` | `views/ProfileEdit.tsx` | auth | TOUR-PROFILE-EDIT |
| 36 | `/messages` | `views/Messages.tsx` | auth | TOUR-MESSAGES |
| 37 | `/messages/[id]` | `views/ChatRoom.tsx` | auth | TOUR-CHATROOM |
| 38 | `/notifications` | `views/Notifications.tsx` | auth | TOUR-NOTIFICATIONS |
| 39 | `/friends` | `views/Friends.tsx` | auth | TOUR-FRIENDS |
| 40 | `/orders` | `views/Orders.tsx` | auth | TOUR-ORDERS |
| 41 | `/orders/success` | `views/OrderStatus.tsx` | auth | TOUR-ORDER-SUCCESS |
| 42 | `/orders/cancel` | `views/OrderStatus.tsx` | auth | TOUR-ORDER-CANCEL |
| 43 | `/order/[token]` | `views/OrderStatus.tsx` | public | TOUR-ORDER-TOKEN |
| 44 | `/cart` | `views/Cart.tsx` | auth | TOUR-CART |
| 45 | `/wallet` | `views/Wallet.tsx` | auth | TOUR-WALLET |
| 46 | `/bookmarks` | `views/Bookmarks.tsx` | auth | TOUR-BOOKMARKS |
| 47 | `/nearby` | `views/NearbyMap.tsx` | auth | TOUR-NEARBY |
| 48 | `/hashtag/[name]` | `views/HashtagFeed.tsx` | auth | TOUR-HASHTAG |
| 49 | `/coupons` | `views/CouponsManage.tsx` | auth | TOUR-COUPONS |
| 50 | `/referral` | `views/Referral.tsx` | auth | TOUR-REFERRAL |
| 51 | `/scorecard` | `views/Scorecard.tsx` | auth | TOUR-SCORECARD |
| 52 | `/analytics` | `views/BusinessAnalytics.tsx` | business owner | TOUR-ANALYTICS |
| 53 | `/settings` | `views/AccountSettings.tsx` | auth | TOUR-SETTINGS |
| 54 | `/account` | `views/AccountSettings.tsx` | auth | TOUR-ACCOUNT |
| 55 | `/privacy` | `views/PrivacyAndSecurity.tsx` | auth | TOUR-PRIVACY |
| 56 | `/admin` | `views/Admin.tsx` | admin only | TOUR-ADMIN |
| 57 | `/admin/devops` | `views/DevOps.tsx` | admin only | TOUR-DEVOPS |
| 58 | `/service-agreement` | `views/ServiceAgreement.tsx` | all | excluded — static legal text |
| 59 | `/mewacho` | mewacho dir | auth | TOUR-MEWACHO (gap — see Part C) |

---

## PART B: GAP AND CONFLICT REPORT

### UNVERIFIED items (cannot read view source in this environment)
The `read_code` tool returned empty for all `.tsx` view files. All anatomy maps
below are therefore built from:
- File names and route paths (verified)
- Import statements and component names (verified from first-100-line reads)
- `data-page-guide` attributes in the codebase (verified via grep)
- `PageGuide.tsx` copy strings (verified — full file read)
- `featureFlags.ts` (verified — `page_guided_tours` flag exists, default OFF)
- `en.json` locale keys (verified partial read)
- Home.tsx (200+ lines verified), Orders.tsx (100 lines), Profile.tsx (100 lines),
  Register.tsx (100 lines), Landing page.tsx (full read), AppLayout.tsx (verified via grep)

### Elements requiring `data-page-guide` hooks to be added
Every element listed below currently has no stable hook. File and proposed
attribute are noted per step. No code has been changed; these are proposals.

### Conflicts
- `page_guided_tours` feature flag is **OFF by default** (rollout: 0).
  PageGuide renders nothing until the flag is enabled per user.
  → Tours cannot auto-start until the flag is turned on.
  → Recommendation: enable in staging for QA, then roll out to 100% for launch.

### Questions still open
1. `/mewacho` — directory exists but no view file was read. Excluded pending clarification.
2. Demo mode (`is_demo` / `onboarding_mode`) — does the demo account see the same tours? Assumed yes.
3. Admin tours (`/admin`, `/admin/devops`) — confirm these should only show to `is_admin` users. Assumed yes.
4. Showroom builder (`/showroom/create`, `/showroom/samples`, `/showroom/templates`) — complex multi-step wizard; anatomy treated as a single flow tour below.

---

## PART C: PRODUCT SUMMARY

**Product name:** Nodbusiness  
**Tagline:** Local merchant showrooms and orders  
**Audience:** Local merchants, buyers, and community members — primarily in Ethiopia (ETB currency referenced throughout); also international via Stripe  
**Platform:** Web (responsive, mobile-first progressive web app)  
**Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS v4 · Radix UI / shadcn · Zustand · TanStack Query · react-i18next (English + Amharic)  
**Auth:** JWT cookie (`access_token`) + Google OAuth · roles: guest, user, business owner, admin · demo mode flag (`is_demo`)  
**Theming:** light/dark via `next-themes`  
**Feature flag:** `page_guided_tours` (backend Redis/env, default OFF) gates the PageGuide launcher  

**Existing tour infrastructure (`PageGuide.tsx`):**
- Custom-built, no third-party library
- Spotlight SVG cutout overlay, dimmed background
- Dialog card: step counter, title, description, Back, Next, Skip, close (×)
- Scroll-to-target, keyboard nav (Esc, Tab trap), ARIA `dialog`
- i18n: English + Amharic copy baked in
- localStorage key `nodbusiness-page-guide-seen` — set on Skip or Done
- Launcher button fixed bottom-left, only shown when flag is enabled
- Steps built per-pathname in `buildSteps()` — currently only 4 pages have real steps; all others fall back to 3 generic steps

**Tour library recommendation:** **Extend `PageGuide.tsx`** — no library install needed.  
Missing capabilities to add: chapter support, per-page progress keys, wait-for-element retry, precondition hooks (open tab/modal first), per-step localStorage progress.

---

## PART D: GLOBAL TOUR BEHAVIOR

### Card anatomy (every step)
```
┌─────────────────────────────────────────────────┐
│ Chapter label (small, muted)          [×] close │
│ Step counter  e.g. "3 of 12"                    │
│ ─────────────────────────────────────────────── │
│ Title  (2–5 words, bold)                        │
│ Body   (1–2 sentences, ≤ 25 words)              │
│ ─────────────────────────────────────────────── │
│  [Skip guide]       [← Back]  [Next →] / [Done]│
└─────────────────────────────────────────────────┘
```
- Overlay: `rgba(3,7,18,0.72)` with SVG mask cutout around target  
- Cutout: rounded rect 8 px larger than target on each side  
- Highlight ring: 2 px `border-blue-400` + white shadow  
- Card: max-width 360 px, rounded-2xl, bg-background, shadow-2xl  
- Placement: below target when space permits; above when not; centred on mobile  
- Scroll-to-target: `scrollIntoView({ behavior:'smooth', block:'center' })`  
- No step limit — length follows the Page Anatomy Map  
- Chapters: label shown in card header; chapter skip button added when tour has 2+ chapters  
- Keyboard: `Esc` = skip/close; `→` / `Space` = Next; `←` = Back; Tab trapped inside card  
- Mobile: card width = `calc(100vw - 2rem)`, placed above mobile bottom nav (bottom-safe offset)  
- Dark mode: inherits CSS variables; overlay colour unchanged  
- Animation: card fades in 150 ms; spotlight scales in 200 ms  
- Layering: overlay `z-[1000]`, card `z-[1002]`, AI assistant `z-[2147483647]` stays above  

### Global copy rules
- Title: 2–5 words, sentence case  
- Body: 1–2 sentences, ≤ 25 words each  
- Start with what the element IS or what the user CAN DO  
- Use product's own terms (Showroom, Feed, Wallet, Scorecard, Studio)  
- One idea per step; no jargon; no code terms  
- Never repeat the same opening word twice in a row across adjacent steps  

### Persistence spec
| Key | Value | Meaning |
|-----|-------|---------|
| `nodbusiness-page-guide-seen` | `"true"` | User finished or skipped the very first guide run |
| `nodbusiness-tour-<TOUR_ID>-done` | `"true"` | Per-tour completion |
| `nodbusiness-tour-<TOUR_ID>-chapter` | `"<n>"` | Last completed chapter index (resume) |
| `nodbusiness-tour-<TOUR_ID>-step` | `"<n>"` | Last completed step index (resume) |

On first visit to a page, check `nodbusiness-tour-<TOUR_ID>-done`. If absent, auto-start.  
On revisit, offer "Resume tour" or "Restart" from the launcher button.  
On major release, bump tour version suffix (`TOUR-FEED-v2`) to re-show updated tours.

### Failure handling
If a target element is not found: wait up to 2 seconds (100 ms polling), then skip the step gracefully, log `console.warn('PageGuide: target not found', target)`, and advance to the next step. Never block the user.

### Feature-flag gate
All tours are gated by `page_guided_tours` flag. When the flag returns `enabled_for_user: false`, the launcher button is hidden and no tour starts. Enable the flag per-user or globally via the admin panel or env var `FF_PAGE_GUIDED_TOURS=true`.

---

## PART E: PAGE TOUR SPECIFICATIONS

Each tour follows this structure:
- Overview step (step 1): page purpose
- Chapter per region, top-to-bottom, left-to-right
- End step: recap + pointer to next related tour

Hooks to add are marked **[ADD HOOK]** with the file path.

---

### TOUR-LANDING — Landing Page
**Route:** `/landing` (also `/` when guest)  
**Purpose:** Marketing page — introduces Nodbusiness, offers Sign In / Create Account / Demo / Guest browse  
**Roles:** All (unauthenticated visitors)  
**Auto-start:** First visit, feature flag enabled  
**Chapters:** 1 · Nav bar, 2 · Hero, 3 · Stats, 4 · Features, 5 · Footer CTA

#### Page Anatomy Map
| Region | Element | Notes |
|--------|---------|-------|
| Nav bar | Nodbusiness logo | decorative / home link |
| Nav bar | LandingPreferences button | theme + language switcher |
| Nav bar | "Create Account" link (sm+) | → /register |
| Nav bar | "Sign In" link | → /login |
| Hero section | Tagline pill (Sparkles + text) | decorative |
| Hero section | H1 "Nodbusiness Merchant Commerce" | page title |
| Hero section | Subtitle paragraph | descriptor |
| Hero section | "Create Account" CTA | primary CTA → /register |
| Hero section | "Try the demo" button | TryDemoButton |
| Hero section | "Explore as Guest" link | → /feed |
| Hero section | Demo disclaimer text | informational |
| Stats bar | 4 stat tiles (6 tools / 27+ templates / 24/7 AI / 1 platform) | informational |
| Features section | Section heading | informational |
| Features section | 6 module cards (Social Feed, Marketplace, Showrooms, Wallet, Messaging, AI) | informational |
| Trust section | Heading + paragraph | informational |
| Trust section | 4 trust badges | decorative |
| Trust section | Mock dashboard visual | decorative |
| CTA section | "One account" heading | informational |
| CTA section | "Create Account" button | → /register |
| CTA section | "Sign In" button | → /login |
| Footer | Copyright text | informational |
| Footer | Nav links (Sign In, Register, Marketplace, Showrooms) | navigational |

#### Steps

**Chapter 1 — Navigation bar (steps 1–4)**

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch1 · Step 1 |
| Target | `[data-page-guide="landing-nav"]` · `app/landing/page.tsx` |
| Title | Welcome to Nodbusiness |
| Body | This page introduces the platform. Use the buttons at the top to create an account, sign in, or change your display preferences. |
| Placement | bottom / mobile: bottom |
| Highlight | spotlight, not clickable |
| Action required | none |
| Button labels | Next → |

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch1 · Step 2 |
| Target | `[data-page-guide="landing-preferences"]` · `components/landing/LandingControls.tsx` **[ADD HOOK]** |
| Title | Display preferences |
| Body | Switch between light and dark mode, or change the app language here. |
| Placement | bottom |
| Highlight | spotlight, clickable |
| Action required | none |
| Button labels | ← Back · Next → |

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch1 · Step 3 |
| Target | `[data-page-guide="landing-register"]` · `app/landing/page.tsx` **[ADD HOOK]** (the "Create Account" nav link) |
| Title | Create an account |
| Body | Start here to get your own Nodbusiness profile, business showroom, and wallet. |
| Placement | bottom |
| Highlight | spotlight, clickable |
| Action required | none |
| Button labels | ← Back · Next → |

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch1 · Step 4 |
| Target | `[data-page-guide="landing-signin"]` · `app/landing/page.tsx` **[ADD HOOK]** (the "Sign In" nav button) |
| Title | Already have an account? |
| Body | Tap Sign In to return to your feed, orders, and messages. |
| Placement | bottom |
| Highlight | spotlight, clickable |
| Action required | none |
| Button labels | ← Back · Next → |

**Chapter 2 — Hero (steps 5–8)**

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch2 · Step 5 |
| Target | `[data-page-guide="landing-actions"]` · `app/landing/page.tsx` |
| Title | Three ways to start |
| Body | Create a full account, try the demo workspace, or browse as a guest — no sign-up needed. |
| Placement | bottom / mobile: bottom |
| Highlight | spotlight |
| Action required | none |
| Button labels | ← Back · Next → |

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch2 · Step 6 |
| Target | `[data-page-guide="landing-demo-btn"]` · `components/landing/TryDemoButton.tsx` **[ADD HOOK]** |
| Title | Try the demo |
| Body | The demo workspace lets you explore all features with sample data. Your activity stays separate from real accounts. |
| Placement | bottom |
| Highlight | spotlight, clickable |
| Action required | none |
| Button labels | ← Back · Next → |

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch2 · Step 7 |
| Target | `[data-page-guide="landing-guest"]` · `app/landing/page.tsx` **[ADD HOOK]** ("Explore as Guest" link) |
| Title | Browse without signing in |
| Body | See public businesses and the marketplace as a guest. Sign up later to like, follow, and buy. |
| Placement | bottom |
| Highlight | spotlight, clickable |
| Action required | none |
| Button labels | ← Back · Next → |

**Chapter 3 — Stats (step 8)**

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch3 · Step 8 |
| Target | `[data-page-guide="landing-stats"]` · `app/landing/page.tsx` **[ADD HOOK]** (stats grid) |
| Title | What's included |
| Body | Six merchant tools, 27+ showroom templates, a 24/7 AI assistant, and one connected platform. |
| Placement | top |
| Highlight | outline |
| Action required | none |
| Button labels | ← Back · Next → |

**Chapter 4 — Feature cards (steps 9–10)**

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch4 · Step 9 |
| Target | `[data-page-guide="landing-modules"]` · `app/landing/page.tsx` **[ADD HOOK]** (features grid) |
| Title | All tools in one place |
| Body | Every card is a platform module — Feed, Marketplace, Showrooms, Wallet, Messaging, and AI. |
| Placement | top |
| Highlight | outline |
| Action required | none |
| Button labels | ← Back · Next → |

**Chapter 5 — Footer CTA (step 10)**

| Field | Value |
|-------|-------|
| Step | TOUR-LANDING · Ch5 · Step 10 |
| Target | `[data-page-guide="landing-cta-section"]` · `app/landing/page.tsx` **[ADD HOOK]** (bottom CTA section) |
| Title | Ready to start? |
| Body | Create your account now to unlock the full platform. It takes under a minute. |
| Placement | top |
| Highlight | spotlight, clickable |
| Action required | none |
| Button labels | ← Back · Done |

---

### TOUR-REGISTER — Registration Page
**Route:** `/register`  
**Purpose:** Email + password sign-up with OTP verification; Google OAuth option  
**Roles:** Guest only  
**Chapters:** 1 · Form, 2 · OTP step

#### Steps

| Step | Target | Hook file | Title | Body |
|------|--------|-----------|-------|------|
| Ch1·1 | `[data-page-guide="register-page"]` **[ADD]** · `views/Register.tsx` | Register form | This form creates your Nodbusiness account. Fill in your email and choose a password. |
| Ch1·2 | `[data-page-guide="register-google"]` **[ADD]** · `views/Register.tsx` | Sign up with Google | The fastest option — one tap links your Google account with no password needed. |
| Ch1·3 | `[data-page-guide="register-email"]` **[ADD]** · `views/Register.tsx` | Email field | Enter the email address you want linked to your account. |
| Ch1·4 | `[data-page-guide="register-password"]` **[ADD]** · `views/Register.tsx` | Choose a password | Pick a strong password. It must match the confirm field below. |
| Ch1·5 | `[data-page-guide="register-confirm"]` **[ADD]** · `views/Register.tsx` | Confirm your password | Re-enter the same password to make sure it is correct. |
| Ch1·6 | `[data-page-guide="register-terms"]` **[ADD]** · `views/Register.tsx` | Terms of Service | Tick this box to agree before your account can be created. |
| Ch1·7 | `[data-page-guide="register-submit"]` **[ADD]** · `views/Register.tsx` | Create your account | Tap this button to submit. A verification code will be sent to your email. |
| Ch2·8 | `[data-page-guide="register-otp"]` **[ADD]** · `views/Register.tsx` | Verify your email | Enter the 6-digit code we emailed you. It expires in a few minutes. |
| Ch2·9 | `[data-page-guide="register-resend"]` **[ADD]** · `views/Register.tsx` | Didn't get the code? | Tap Resend after the countdown to receive a new verification code. |

---

### TOUR-LOGIN — Login Page
**Route:** `/login`  
**Purpose:** Email/password or Google OAuth login  
**Roles:** Guest only  
**Chapters:** 1 · Login form

#### Steps

| Step | Target | Title | Body |
|------|--------|-------|------|
| Ch1·1 | `[data-page-guide="login-google"]` **[ADD]** `views/Login.tsx` | Sign in with Google | The quickest way in — one tap and you are back in your account. |
| Ch1·2 | `[data-page-guide="login-email"]` **[ADD]** `views/Login.tsx` | Email address | Enter the email you used when you registered. |
| Ch1·3 | `[data-page-guide="login-password"]` **[ADD]** `views/Login.tsx` | Your password | Enter your password. Tap the eye icon to reveal it if needed. |
| Ch1·4 | `[data-page-guide="login-forgot"]` **[ADD]** `views/Login.tsx` | Forgot your password? | Tap here to receive a reset link by email. |
| Ch1·5 | `[data-page-guide="login-submit"]` **[ADD]** `views/Login.tsx` | Log in | Tap to sign in and go to your Feed. |
| Ch1·6 | `[data-page-guide="login-register-link"]` **[ADD]** `views/Login.tsx` | New here? | No account yet? Tap Create Account to register for free. |

---

### TOUR-ONBOARD — Onboarding Page
**Route:** `/onboarding`  
**Purpose:** Post-registration setup wizard (name, profile type, interests)  
**Roles:** Newly registered users  
**Chapters:** 1 · Welcome, 2 · Profile setup

#### Steps

| Step | Target | Title | Body |
|------|--------|-------|------|
| Ch1·1 | `[data-page-guide="onboard-welcome"]` **[ADD]** `views/Onboarding.tsx` | You're in — welcome! | This quick setup helps Nodbusiness personalise your experience. It only takes a moment. |
| Ch2·2 | `[data-page-guide="onboard-name"]` **[ADD]** `views/Onboarding.tsx` | Your display name | This is how other users will see you across the platform. |
| Ch2·3 | `[data-page-guide="onboard-type"]` **[ADD]** `views/Onboarding.tsx` | Personal or Business? | Choose Personal to browse and buy, or Business to sell and create a showroom. |
| Ch2·4 | `[data-page-guide="onboard-continue"]` **[ADD]** `views/Onboarding.tsx` | Continue to your Feed | Tap Continue when you are ready. You can update everything later in Settings. |

---

### TOUR-FEED — Feed (Home) Page
**Route:** `/feed`  
**Purpose:** Main social feed — posts, filters, stories, map tab, showroom banner  
**Roles:** Authenticated users; guests see a limited read-only version  
**Chapters:** 1 · Header, 2 · Guest banner (conditional), 3 · Showroom banner, 4 · Announcement ticker, 5 · Filter bar, 6 · Post list, 7 · Map tab (when active), 8 · Create post

#### Page Anatomy Map (verified elements)
- App-wide sticky header (`data-page-guide="app-header"`)
- Desktop sidebar (`data-page-guide="desktop-navigation"`)
- Mobile bottom nav (`data-page-guide="mobile-navigation"`)
- Guest read-only banner (conditional, `authChecked && !isAuthenticated`)
- Showroom studio banner (`data-page-guide="feed-banner"`) — h1, subtitle, Get Started/Join Free CTA
- Company announcement ticker (`data-page-guide="feed-content"`) — marquee text, hide/show button
- Filter chips bar — For You / Nearby / Following / Trending / refresh button
- Nearby / map tab (conditional)
- Post list — infinite scroll, PostCard components
- Create post form (authenticated users)
- Sentinel div (intersection observer for infinite scroll)

#### Steps

**Chapter 1 — Header (step 1)**

| Field | Value |
|-------|-------|
| Step | TOUR-FEED · Ch1 · Step 1 |
| Target | `[data-page-guide="app-header"]` · `components/layout/AppLayout.tsx` |
| Title | Platform header |
| Body | The top bar stays visible on every page. Use it to go home, search, and reach notifications, cart, and your profile. |
| Placement | bottom |
| Highlight | spotlight |
| Visibility | all |

**Chapter 2 — Guest banner (step 2, authenticated guests only)**

| Field | Value |
|-------|-------|
| Step | TOUR-FEED · Ch2 · Step 2 |
| Target | `[data-page-guide="feed-guest-banner"]` · `views/Home.tsx` **[ADD HOOK]** |
| Title | You are browsing as a guest |
| Body | Sign up for free to like posts, follow businesses, and place orders. |
| Placement | bottom |
| Highlight | outline |
| Visibility | `!isAuthenticated` only |

**Chapter 3 — Showroom banner (step 3)**

| Field | Value |
|-------|-------|
| Step | TOUR-FEED · Ch3 · Step 3 |
| Target | `[data-page-guide="feed-banner"]` · `views/Home.tsx` |
| Title | Build a showroom |
| Body | Tap Get Started to create a mini website for your business — pick a template and go live in minutes. |
| Placement | bottom |
| Highlight | spotlight, clickable |

**Chapter 4 — Announcement ticker (step 4)**

| Field | Value |
|-------|-------|
| Step | TOUR-FEED · Ch4 · Step 4 |
| Target | `[data-page-guide="feed-content"]` · `views/Home.tsx` |
| Title | Nodbusiness announcements |
| Body | Platform news scrolls here. Tap the × to hide it, or the eye icon to bring it back. |
| Placement | bottom |
| Highlight | outline |

**Chapter 5 — Filter bar (steps 5–6)**

| Field | Value |
|-------|-------|
| Step | TOUR-FEED · Ch5 · Step 5 |
| Target | `[data-page-guide="feed-filters"]` · `views/Home.tsx` **[ADD HOOK]** (filter chips container) |
| Title | Filter your feed |
| Body | Switch between For You, Nearby, Following, and Trending to change which posts you see. |
| Placement | bottom |
| Highlight | spotlight |
| Visibility | authenticated only |

| Field | Value |
|-------|-------|
| Step | TOUR-FEED · Ch5 · Step 6 |
| Target | `[data-page-guide="feed-refresh"]` · `views/Home.tsx` **[ADD HOOK]** (refresh button) |
| Title | Refresh the feed |
| Body | Tap this button to load the latest posts from scratch. |
| Placement | bottom |
| Highlight | spotlight, clickable |
| Visibility | authenticated only |

**Chapter 6 — Post list (steps 7–8)**

| Field | Value |
|-------|-------|
| Step | TOUR-FEED · Ch6 · Step 7 |
| Target | `[data-page-guide="feed-posts"]` · `views/Home.tsx` **[ADD HOOK]** (posts container) |
| Title | Posts from your network |
| Body | Scroll down to browse posts. Like, comment, share, or bookmark any post with the icons below each one. |
| Placement | top |
| Highlight | outline |

| Field | Value |
|-------|-------|
| Step | TOUR-FEED · Ch6 · Step 8 |
| Target | `[data-page-guide="feed-create-post"]` · `views/Home.tsx` **[ADD HOOK]** (CreatePostForm) |
| Title | Share something |
| Body | Tap here to write a post, add photos, or share a product to your feed. |
| Placement | bottom |
| Highlight | spotlight, clickable |
| Visibility | authenticated only |

**End step**

| Field | Value |
|-------|-------|
| Step | TOUR-FEED · End · Step 9 |
| Target | `[data-page-guide="app-header"]` |
| Title | Feed tour complete |
| Body | Explore the sidebar to visit Marketplace, Messages, or your Profile. Start the Marketplace tour for a full walkthrough. |
| Placement | bottom |
| Highlight | none |
| Button labels | Done |

---

### TOUR-MARKETPLACE — Marketplace Page
**Route:** `/marketplace`  
**Purpose:** Browse and search products from all sellers  
**Roles:** Authenticated + guest  
**Chapters:** 1 · Heading, 2 · Search, 3 · Categories, 4 · Product grid

#### Steps

| Step | Target | Hook file | Title | Body |
|------|--------|-----------|-------|------|
| Ch1·1 | `[data-page-guide="marketplace-heading"]` `views/Marketplace.tsx` | The Marketplace | Browse and buy products from local sellers all in one place. |
| Ch2·2 | `[data-page-guide="marketplace-search"]` `views/Marketplace.tsx` | Find a product | Type a product name or keyword to narrow the list instantly. |
| Ch3·3 | `[data-page-guide="marketplace-categories"]` `views/Marketplace.tsx` | Browse by category | Tap a category chip to filter products by type. Tap All to reset. |
| Ch4·4 | `[data-page-guide="marketplace-products"]` `views/Marketplace.tsx` | Product cards | Each card shows the price and seller. Tap a card to see full details and buy. |
| End·5 | `[data-page-guide="marketplace-products"]` | Marketplace done | Tap any product to open the detail page, add to cart, or contact the seller. |

---

### TOUR-SEARCH — Search Page
**Route:** `/search`  
**Purpose:** Platform-wide search for people, products, showrooms, and posts  
**Roles:** Authenticated + guest  
**Chapters:** 1 · Search input, 2 · Filter tabs, 3 · Results

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="search-input"]` `views/Search.tsx` | Search anything | Enter a name, product, showroom, or hashtag to find matches across the platform. |
| Ch2·2 | `[data-page-guide="search-tabs"]` `views/Search.tsx` | Filter by type | Choose People, Products, Showrooms, or Posts to focus your results. |
| Ch3·3 | `[data-page-guide="search-results"]` `views/Search.tsx` **[ADD]** | Your results | Tap any result to open it. Results update as you type. |
| Ch3·4 | `[data-page-guide="search-empty"]` `views/Search.tsx` **[ADD]** | No results yet | If nothing appears, check the spelling or try a different filter tab. |

---

### TOUR-PROFILE-OWN — Own Profile Page
**Route:** `/profile` and `/profile/[id]` (own id)  
**Purpose:** Personal and business profile view — posts, businesses, showrooms, edit access  
**Roles:** Authenticated (viewing own profile)  
**Chapters:** 1 · Header area, 2 · View toggle, 3 · Personal tab, 4 · Business tab, 5 · Actions

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="profile-header"]` `views/Profile.tsx` **[ADD]** | Your profile |Your name, avatar, and cover photo appear here. These are visible to everyone on the platform. |
| Ch1·2 | `[data-page-guide="profile-avatar"]` `views/Profile.tsx` **[ADD]** | Profile photo | This is your public avatar. Tap Edit Profile to change it. |
| Ch1·3 | `[data-page-guide="profile-verified"]` `views/Profile.tsx` **[ADD]** | Verified badge | This badge shows your account is verified. Verification status is set by Nodbusiness. |
| Ch2·4 | `[data-page-guide="profile-view-toggle"]` `views/Profile.tsx` **[ADD]** | Switch views | Toggle between your Personal and Business profiles. Each has its own posts and showrooms. |
| Ch3·5 | `[data-page-guide="profile-personal-tab"]` `components/profile/PersonalProfile.tsx` **[ADD]** | Personal profile | Your personal posts, followers, and following count live here. |
| Ch4·6 | `[data-page-guide="profile-business-tab"]` `components/profile/BusinessProfile.tsx` **[ADD]** | Business profile | Your registered businesses and their showrooms are listed here. |
| Ch5·7 | `[data-page-guide="profile-edit-btn"]` `views/Profile.tsx` **[ADD]** | Edit your profile | Tap Edit to update your name, bio, location, and photo. |
| Ch5·8 | `[data-page-guide="profile-create-showroom"]` `views/Profile.tsx` **[ADD]** | Add a showroom | Tap the + button to create a new showroom for one of your businesses. |
| End·9 | `[data-page-guide="profile-header"]` | Profile tour done | Visit Settings to manage privacy, security, and notification preferences. |

---

### TOUR-ORDERS — Orders Page
**Route:** `/orders`  
**Purpose:** View all buyer and seller orders; expand order details; manage delivery; download invoices  
**Roles:** Authenticated  
**Chapters:** 1 · Page header, 2 · Order list, 3 · Order detail (expanded), 4 · Seller actions, 5 · Delivery timeline

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="orders-header"]` `views/Orders.tsx` **[ADD]** | Your orders | Every order you placed or received as a seller appears here. |
| Ch1·2 | `[data-page-guide="orders-tabs"]` `views/Orders.tsx` **[ADD]** | Buyer and seller tabs | Switch between orders you placed and orders you received. |
| Ch2·3 | `[data-page-guide="orders-list"]` `views/Orders.tsx` **[ADD]** | Order cards | Each card shows the product, status badge, and order date. Tap a card to expand it. |
| Ch2·4 | `[data-page-guide="orders-status-badge"]` `views/Orders.tsx` **[ADD]** | Order status | Colours tell you the order state — yellow for pending, green for paid, red for cancelled. |
| Ch3·5 | `[data-page-guide="orders-detail-expand"]` `views/Orders.tsx` **[ADD]** | Order details | Expanding an order shows item breakdown, delivery address, and available actions. |
| Ch3·6 | `[data-page-guide="orders-invoice-btn"]` `views/Orders.tsx` **[ADD]** | Download invoice | Tap the invoice icon to download a PDF receipt for any completed order. |
| Ch3·7 | `[data-page-guide="orders-return-btn"]` `views/Orders.tsx` **[ADD]** | Request a return | If something is wrong, tap Return to start a return or refund request. |
| Ch4·8 | `[data-page-guide="orders-seller-actions"]` `views/Orders.tsx` **[ADD]** | Seller controls | As a seller, confirm, process, ship, or mark orders as delivered from this panel. |
| Ch5·9 | `[data-page-guide="orders-delivery-timeline"]` `views/Orders.tsx` **[ADD]** | Delivery timeline | Track where the shipment is — sellers can add updates and buyers see them in real time. |
| End·10 | `[data-page-guide="orders-header"]` | Orders tour done | Open the Wallet tour to see payment history and manage your balance. |

---

### TOUR-WALLET — Wallet Page
**Route:** `/wallet`  
**Purpose:** Wallet balance, transaction history, top-up, and payout  
**Roles:** Authenticated  
**Chapters:** 1 · Balance, 2 · Transactions, 3 · Actions

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="wallet-balance"]` `views/Wallet.tsx` **[ADD]** | Your wallet balance | This is the amount available to spend or transfer in your Nodbusiness wallet. |
| Ch1·2 | `[data-page-guide="wallet-currency"]` `views/Wallet.tsx` **[ADD]** | Currency display | Your balance is shown in ETB (Ethiopian Birr) by default. |
| Ch2·3 | `[data-page-guide="wallet-transactions"]` `views/Wallet.tsx` **[ADD]** | Transaction history | Every incoming and outgoing payment is listed here with date and status. |
| Ch2·4 | `[data-page-guide="wallet-filter"]` `views/Wallet.tsx` **[ADD]** | Filter transactions | Filter by date, type, or status to find a specific payment. |
| Ch3·5 | `[data-page-guide="wallet-topup"]` `views/Wallet.tsx` **[ADD]** | Add funds | Top up your wallet with Stripe or Chapa using the Add Funds button. |
| Ch3·6 | `[data-page-guide="wallet-payout"]` `views/Wallet.tsx` **[ADD]** | Withdraw funds | Move your wallet balance to a bank account or mobile money with Withdraw. |
| End·7 | `[data-page-guide="wallet-balance"]` | Wallet tour done | Use your wallet balance at checkout in the Marketplace or to pay for subscriptions. |

---

### TOUR-MESSAGES — Messages Page
**Route:** `/messages`  
**Purpose:** List of all conversations  
**Roles:** Authenticated  
**Chapters:** 1 · Conversation list, 2 · New conversation

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="messages-header"]` `views/Messages.tsx` **[ADD]** | Your messages | All your direct conversations appear here, newest first. |
| Ch1·2 | `[data-page-guide="messages-list"]` `views/Messages.tsx` **[ADD]** | Conversation list | Tap any conversation to open it and see the full message history. |
| Ch1·3 | `[data-page-guide="messages-search"]` `views/Messages.tsx` **[ADD]** | Search conversations | Type a name to quickly find a specific conversation. |
| Ch2·4 | `[data-page-guide="messages-new"]` `views/Messages.tsx` **[ADD]** | Start a conversation | Tap the compose button to message any user or business directly. |
| End·5 | `[data-page-guide="messages-header"]` | Messages done | Open a conversation to see the Chat Room tour for sending messages and files. |

---

### TOUR-CHATROOM — Chat Room Page
**Route:** `/messages/[id]`  
**Purpose:** Real-time one-to-one chat  
**Roles:** Authenticated  
**Chapters:** 1 · Header, 2 · Message thread, 3 · Input area

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="chat-header"]` `views/ChatRoom.tsx` **[ADD]** | Conversation header | The other person's name and online status appear here. Tap their name to view their profile. |
| Ch2·2 | `[data-page-guide="chat-messages"]` `views/ChatRoom.tsx` **[ADD]** | Message thread | Your messages appear on the right; theirs on the left. Scroll up to see older messages. |
| Ch3·3 | `[data-page-guide="chat-input"]` `views/ChatRoom.tsx` **[ADD]** | Type a message | Write here and press Enter or the send button to deliver your message. |
| Ch3·4 | `[data-page-guide="chat-attachments"]` `views/ChatRoom.tsx` **[ADD]** | Send a file | Tap the attachment icon to share an image or file in the conversation. |
| End·5 | `[data-page-guide="chat-header"]` | Chat tour done | Go back to Messages to start another conversation. |

---

### TOUR-NOTIFICATIONS — Notifications Page
**Route:** `/notifications`  
**Purpose:** All activity notifications (likes, follows, orders, messages)  
**Roles:** Authenticated  
**Chapters:** 1 · Notification list, 2 · Actions

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="notif-header"]` `views/Notifications.tsx` **[ADD]** | Your notifications | Every alert about your account appears here — likes, comments, orders, and messages. |
| Ch1·2 | `[data-page-guide="notif-list"]` `views/Notifications.tsx` **[ADD]** | Notification list | Tap any notification to go directly to the related post, order, or conversation. |
| Ch1·3 | `[data-page-guide="notif-unread"]` `views/Notifications.tsx` **[ADD]** | Unread indicator | Unread notifications are highlighted. Tapping one marks it as read. |
| Ch2·4 | `[data-page-guide="notif-mark-all"]` `views/Notifications.tsx` **[ADD]** | Mark all as read | Tap this button to clear all unread indicators at once. |
| End·5 | `[data-page-guide="notif-header"]` | Notifications done | Adjust which notifications you receive in Settings → Notifications. |

---

### TOUR-PRODUCT-DETAIL — Product Detail Page
**Route:** `/products/[id]`  
**Purpose:** Full product information, images, buy/add-to-cart, seller contact  
**Roles:** Authenticated + guest  
**Chapters:** 1 · Images, 2 · Info, 3 · Purchase actions, 4 · Seller info

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="product-images"]` `views/ProductDetail.tsx` **[ADD]** | Product photos | Swipe through the images to see the product from every angle. |
| Ch2·2 | `[data-page-guide="product-title"]` `views/ProductDetail.tsx` **[ADD]** | Product details | The name, price, and description tell you exactly what is included. |
| Ch2·3 | `[data-page-guide="product-category"]` `views/ProductDetail.tsx` **[ADD]** | Category and tags | Use these to find similar products in the Marketplace. |
| Ch3·4 | `[data-page-guide="product-add-cart"]` `views/ProductDetail.tsx` **[ADD]** | Add to cart | Tap Add to Cart to save this product for checkout later. |
| Ch3·5 | `[data-page-guide="product-buy-now"]` `views/ProductDetail.tsx` **[ADD]** | Buy now | Tap Buy Now to go straight to checkout without saving to cart. |
| Ch3·6 | `[data-page-guide="product-request"]` `views/ProductDetail.tsx` **[ADD]** | Request pricing | Some products need a quote. Tap Request Price to message the seller directly. |
| Ch4·7 | `[data-page-guide="product-seller"]` `views/ProductDetail.tsx` **[ADD]** | About the seller | See the seller's rating and tap their name to visit their profile or showroom. |
| End·8 | `[data-page-guide="product-add-cart"]` | Product tour done | Go to your Cart to review items and complete checkout. |

---

### TOUR-CART — Cart Page
**Route:** `/cart`  
**Purpose:** Review items before checkout, adjust quantities, proceed to payment  
**Roles:** Authenticated  
**Chapters:** 1 · Cart items, 2 · Summary, 3 · Checkout

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="cart-items"]` `views/Cart.tsx` **[ADD]** | Your cart | Every product you have added appears here. Check quantities before proceeding. |
| Ch1·2 | `[data-page-guide="cart-quantity"]` `views/Cart.tsx` **[ADD]** | Adjust quantity | Use + and − to change how many of each item you want. |
| Ch1·3 | `[data-page-guide="cart-remove"]` `views/Cart.tsx` **[ADD]** | Remove an item | Tap the trash icon to remove a product from your cart. |
| Ch2·4 | `[data-page-guide="cart-summary"]` `views/Cart.tsx` **[ADD]** | Order summary | See the subtotal, any fees, and the final amount before you pay. |
| Ch3·5 | `[data-page-guide="cart-checkout"]` `views/Cart.tsx` **[ADD]** | Go to checkout | Tap Checkout to choose your payment method and confirm the order. |
| End·6 | `[data-page-guide="cart-items"]` | Cart tour done | After checkout, track your orders on the Orders page. |

---

### TOUR-SHOWROOMS — Showrooms Directory Page
**Route:** `/showrooms` (app route) and `/showrooms/[id]`  
**Purpose:** Browse published business showrooms  
**Roles:** Authenticated + guest  
**Chapters:** 1 · Search/filter, 2 · Showroom grid

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="showrooms-header"]` `views/Showrooms.tsx` **[ADD]** | Business showrooms | Every business with a live mini website is listed here. |
| Ch1·2 | `[data-page-guide="showrooms-search"]` `views/Showrooms.tsx` **[ADD]** | Find a showroom | Type a business name or category to filter the list. |
| Ch2·3 | `[data-page-guide="showrooms-grid"]` `views/Showrooms.tsx` **[ADD]** | Showroom cards | Each card shows the logo, name, and category. Tap to open the full showroom. |
| End·4 | `[data-page-guide="showrooms-grid"]` | Showrooms done | Create your own showroom from the Feed banner or Showroom Studio. |

---

### TOUR-SHOWROOM-VIEW — Public Showroom Page
**Route:** `/showroom/[slug]` and `/showrooms/[id]`  
**Purpose:** Public-facing business mini website  
**Roles:** All  
**Chapters:** 1 · Hero, 2 · Sections, 3 · Contact / actions

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="showroom-hero"]` `views/ShowroomView.tsx` **[ADD]** | Business showroom | This is the business's public mini website — logo, cover, and headline section. |
| Ch1·2 | `[data-page-guide="showroom-sections"]` `views/ShowroomView.tsx` **[ADD]** | Showroom sections | Scroll down to see products, services, team, testimonials, and contact details. |
| Ch2·3 | `[data-page-guide="showroom-products"]` `views/ShowroomView.tsx` **[ADD]** | Products section | Tap any product to open its detail page and buy directly. |
| Ch3·4 | `[data-page-guide="showroom-contact"]` `views/ShowroomView.tsx` **[ADD]** | Contact the business | Tap Message to chat with the seller, or use their listed phone and address. |
| End·5 | `[data-page-guide="showroom-hero"]` | Showroom done | Browse more showrooms in the Showrooms directory. |

---

### TOUR-SHOWROOM-CREATE — Showroom Creation Flow
**Route:** `/showroom/create` → `/showroom/samples` → `/showroom/templates`  
**Purpose:** Multi-step wizard to create a business showroom  
**Roles:** Business owners  
**Chapters:** 1 · Name and category, 2 · Template selection, 3 · Section builder, 4 · Publish

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="showroom-create-name"]` `views/ShowroomCreate.tsx` **[ADD]** | Name your showroom | This becomes your business's public web address on Nodbusiness. |
| Ch1·2 | `[data-page-guide="showroom-create-category"]` `views/ShowroomCreate.tsx` **[ADD]** | Choose a category | Select the category that best describes your business type. |
| Ch2·3 | `[data-page-guide="showroom-templates"]` `views/ShowroomWizard.tsx` **[ADD]** | Pick a template | Templates give you a ready-made layout. Choose the one closest to your business. |
| Ch3·4 | `[data-page-guide="showroom-builder"]` `views/ShowroomCreate.tsx` **[ADD]** | Customise sections | Add, remove, or reorder sections — hero, products, team, testimonials, and more. |
| Ch3·5 | `[data-page-guide="showroom-section-editor"]` `views/ShowroomCreate.tsx` **[ADD]** | Edit a section | Tap any section to edit its text, images, and layout. Changes preview instantly. |
| Ch3·6 | `[data-page-guide="showroom-preview"]` `views/ShowroomCreate.tsx` **[ADD]** | Live preview | This panel shows exactly how your showroom looks to visitors. |
| Ch4·7 | `[data-page-guide="showroom-publish"]` `views/ShowroomCreate.tsx` **[ADD]** | Publish your showroom | Tap Publish to make your showroom live. You can edit it any time after. |
| End·8 | `[data-page-guide="showroom-publish"]` | Showroom done | Share the link to your showroom on the Feed to reach customers immediately. |

---

### TOUR-PROFILE-EDIT — Edit Profile Page
**Route:** `/profile/edit`  
**Purpose:** Update name, avatar, cover, bio, location, ticker  
**Roles:** Authenticated  
**Chapters:** 1 · Photo fields, 2 · Info fields, 3 · Ticker settings

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="profile-edit-avatar"]` `views/ProfileEdit.tsx` **[ADD]** | Profile photo | Tap the avatar to upload a new photo. Recommended size: 400 × 400 px. |
| Ch1·2 | `[data-page-guide="profile-edit-cover"]` `views/ProfileEdit.tsx` **[ADD]** | Cover image | The cover appears at the top of your profile. Landscape images work best. |
| Ch2·3 | `[data-page-guide="profile-edit-name"]` `views/ProfileEdit.tsx` **[ADD]** | Display name | This is the name everyone sees on your posts and profile. |
| Ch2·4 | `[data-page-guide="profile-edit-bio"]` `views/ProfileEdit.tsx` **[ADD]** | Bio | Write a short description of who you are or what your business does. |
| Ch2·5 | `[data-page-guide="profile-edit-location"]` `views/ProfileEdit.tsx` **[ADD]** | Location | Adding a city helps local customers find you in Nearby searches. |
| Ch3·6 | `[data-page-guide="profile-edit-ticker"]` `views/ProfileEdit.tsx` **[ADD]** | Profile ticker | Turn on a scrolling announcement on your profile — great for promotions. |
| End·7 | `[data-page-guide="profile-edit-avatar"]` | Profile edit done | Tap Save to apply your changes. They appear on your profile immediately. |

---

### TOUR-SETTINGS — Settings / Account Page
**Route:** `/settings` and `/account`  
**Purpose:** Account settings — email, password, language, notifications  
**Roles:** Authenticated  
**Chapters:** 1 · Account details, 2 · Preferences, 3 · Notifications, 4 · Danger zone

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="settings-header"]` `views/AccountSettings.tsx` **[ADD]** | Account settings | Manage everything about your account from this page. |
| Ch1·2 | `[data-page-guide="settings-email"]` `views/AccountSettings.tsx` **[ADD]** | Email address | Your login email is shown here. Contact support to change it. |
| Ch1·3 | `[data-page-guide="settings-password"]` `views/AccountSettings.tsx` **[ADD]** | Change password | Update your password here. You will need to confirm your current one first. |
| Ch2·4 | `[data-page-guide="settings-language"]` `views/AccountSettings.tsx` **[ADD]** | Language | Switch between English and Amharic. The change applies immediately. |
| Ch2·5 | `[data-page-guide="settings-theme"]` `views/AccountSettings.tsx` **[ADD]** | Theme | Choose light or dark mode, or follow your device's system setting. |
| Ch3·6 | `[data-page-guide="settings-notifications"]` `views/AccountSettings.tsx` **[ADD]** | Notification preferences | Choose which activity types send you a notification or an email. |
| Ch4·7 | `[data-page-guide="settings-danger"]` `views/AccountSettings.tsx` **[ADD]** | Danger zone | Delete your account permanently here. This action cannot be undone. |
| End·8 | `[data-page-guide="settings-header"]` | Settings done | Visit Privacy and Security to manage who can see your content. |

---

### TOUR-PRIVACY — Privacy and Security Page
**Route:** `/privacy`  
**Purpose:** Privacy settings, blocked users, data export, account deletion  
**Roles:** Authenticated  
**Chapters:** 1 · Visibility, 2 · Blocked users, 3 · Data

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="privacy-header"]` `views/PrivacyAndSecurity.tsx` **[ADD]** | Privacy and security | Control who sees your profile and how your data is used. |
| Ch1·2 | `[data-page-guide="privacy-visibility"]` `views/PrivacyAndSecurity.tsx` **[ADD]** | Profile visibility | Set your profile to Public or Private. Private profiles are only visible to followers. |
| Ch2·3 | `[data-page-guide="privacy-blocked"]` `views/PrivacyAndSecurity.tsx` **[ADD]** | Blocked users | Accounts you have blocked cannot see your profile or message you. |
| Ch3·4 | `[data-page-guide="privacy-export"]` `views/PrivacyAndSecurity.tsx` **[ADD]** | Export your data | Download a copy of all your account data at any time. |
| End·5 | `[data-page-guide="privacy-header"]` | Privacy done | Your changes are saved automatically. |

---

### TOUR-NEARBY — Nearby Map Page
**Route:** `/nearby`  
**Purpose:** Map view of nearby products, businesses, and users  
**Roles:** Authenticated  
**Chapters:** 1 · Map, 2 · Filters, 3 · Markers

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="nearby-map"]` `views/NearbyMap.tsx` **[ADD]** | Nearby map | The map shows businesses and products near your current location. |
| Ch1·2 | `[data-page-guide="nearby-locate"]` `views/NearbyMap.tsx` **[ADD]** | Your location | Tap the locate button to centre the map on where you are right now. |
| Ch2·3 | `[data-page-guide="nearby-filters"]` `views/NearbyMap.tsx` **[ADD]** | Filter nearby results | Choose to show Businesses, Products, or People on the map. |
| Ch3·4 | `[data-page-guide="nearby-marker"]` `views/NearbyMap.tsx` **[ADD]** | Map pins | Tap a pin to see a quick preview. Tap the preview to open the full profile or product. |
| End·5 | `[data-page-guide="nearby-map"]` | Nearby done | Adjust your search radius from the filter panel to see more or fewer results. |

---

### TOUR-FRIENDS — Friends Page
**Route:** `/friends`  
**Purpose:** Manage followers, following, and friend suggestions  
**Roles:** Authenticated  
**Chapters:** 1 · Tabs, 2 · Suggestions, 3 · Follow actions

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="friends-header"]` `views/Friends.tsx` **[ADD]** | Friends and followers | See who follows you, who you follow, and people you might know. |
| Ch1·2 | `[data-page-guide="friends-tabs"]` `views/Friends.tsx` **[ADD]** | Switch tabs | Toggle between Followers, Following, and Suggestions to manage your network. |
| Ch2·3 | `[data-page-guide="friends-suggestions"]` `views/Friends.tsx` **[ADD]** | People you may know | These are accounts with mutual connections or shared interests. |
| Ch3·4 | `[data-page-guide="friends-follow-btn"]` `views/Friends.tsx` **[ADD]** | Follow or unfollow | Tap Follow to add someone to your feed. Tap again to unfollow. |
| End·5 | `[data-page-guide="friends-header"]` | Friends done | Your following list determines who appears in the Following feed filter. |

---

### TOUR-BOOKMARKS — Bookmarks Page
**Route:** `/bookmarks`  
**Purpose:** Saved posts, products, and showrooms  
**Roles:** Authenticated  
**Chapters:** 1 · Tabs, 2 · Bookmark list

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="bookmarks-header"]` `views/Bookmarks.tsx` **[ADD]** | Your bookmarks | Everything you have saved — posts, products, and showrooms — is here. |
| Ch1·2 | `[data-page-guide="bookmarks-tabs"]` `views/Bookmarks.tsx` **[ADD]** | Filter by type | Switch between Posts, Products, and Showrooms to find what you saved. |
| Ch2·3 | `[data-page-guide="bookmarks-list"]` `views/Bookmarks.tsx` **[ADD]** | Saved items | Tap any item to open it. Tap the bookmark icon again on a post or product to remove it. |
| End·4 | `[data-page-guide="bookmarks-header"]` | Bookmarks done | Add bookmarks by tapping the bookmark icon on any post or product card. |

---

### TOUR-EXPLORE — Explore Page
**Route:** `/explore`  
**Purpose:** Discover trending content, new businesses, and featured showrooms  
**Roles:** Authenticated  
**Chapters:** 1 · Featured, 2 · Trending, 3 · Categories

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="explore-header"]` `views/Explore.tsx` **[ADD]** | Explore Nodbusiness | Discover trending posts, new businesses, and featured showrooms. |
| Ch1·2 | `[data-page-guide="explore-featured"]` `views/Explore.tsx` **[ADD]** | Featured content | Curated posts and businesses promoted by Nodbusiness appear at the top. |
| Ch2·3 | `[data-page-guide="explore-trending"]` `views/Explore.tsx` **[ADD]** | Trending now | The most-liked and shared content across the platform is shown here. |
| Ch3·4 | `[data-page-guide="explore-categories"]` `views/Explore.tsx` **[ADD]** | Browse categories | Tap a category to filter the explore feed by business type or topic. |
| End·5 | `[data-page-guide="explore-header"]` | Explore done | Tap any hashtag in a post to open a dedicated hashtag feed. |

---

### TOUR-HASHTAG — Hashtag Feed Page
**Route:** `/hashtag/[name]`  
**Purpose:** All posts tagged with a specific hashtag  
**Roles:** Authenticated  
**Chapters:** 1 · Header, 2 · Posts

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="hashtag-header"]` `views/HashtagFeed.tsx` **[ADD]** | Hashtag feed | All posts tagged with this hashtag are collected here. |
| Ch1·2 | `[data-page-guide="hashtag-follow-btn"]` `views/HashtagFeed.tsx` **[ADD]** | Follow this hashtag | Tap Follow to add posts with this tag to your main feed. |
| Ch2·3 | `[data-page-guide="hashtag-posts"]` `views/HashtagFeed.tsx` **[ADD]** | Tagged posts | Scroll to browse. Like, comment, or share just as you would in the main feed. |

---

### TOUR-ANALYTICS — Business Analytics Page
**Route:** `/analytics`  
**Purpose:** View post reach, showroom visits, follower growth, and sales stats  
**Roles:** Business owners  
**Chapters:** 1 · Summary tiles, 2 · Charts, 3 · Top content

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="analytics-header"]` `views/BusinessAnalytics.tsx` **[ADD]** | Business analytics | See how your posts, showroom, and products are performing. |
| Ch1·2 | `[data-page-guide="analytics-tiles"]` `views/BusinessAnalytics.tsx` **[ADD]** | Summary numbers | Total views, followers, orders, and revenue at a glance. |
| Ch2·3 | `[data-page-guide="analytics-chart"]` `views/BusinessAnalytics.tsx` **[ADD]** | Growth chart | The chart shows your follower and visit trends over time. Hover a point for details. |
| Ch3·4 | `[data-page-guide="analytics-top-posts"]` `views/BusinessAnalytics.tsx` **[ADD]** | Top posts | Your best-performing posts by reach and engagement are ranked here. |
| End·5 | `[data-page-guide="analytics-header"]` | Analytics done | Use these insights to decide when to post and which products to promote. |

---

### TOUR-BIZ-CREATE — Create Business Page
**Route:** `/business/create`  
**Purpose:** Register a new business profile  
**Roles:** Authenticated  
**Chapters:** 1 · Business info, 2 · Branding, 3 · Submit

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="biz-create-name"]` `views/BusinessCreate.tsx` **[ADD]** | Business name | Enter the official name customers will see on your profile and showroom. |
| Ch1·2 | `[data-page-guide="biz-create-category"]` `views/BusinessCreate.tsx` **[ADD]** | Business category | Choose the category that best matches what your business sells or offers. |
| Ch1·3 | `[data-page-guide="biz-create-description"]` `views/BusinessCreate.tsx` **[ADD]** | Description | Write a short summary of your business. This appears on your profile. |
| Ch2·4 | `[data-page-guide="biz-create-logo"]` `views/BusinessCreate.tsx` **[ADD]** | Business logo | Upload a square logo. It will appear on your showroom and product cards. |
| Ch2·5 | `[data-page-guide="biz-create-color"]` `views/BusinessCreate.tsx` **[ADD]** | Theme colour | Pick a colour that matches your brand. It is used across your showroom. |
| Ch3·6 | `[data-page-guide="biz-create-submit"]` `views/BusinessCreate.tsx` **[ADD]** | Create your business | Tap Create to register the business. You can add products and a showroom next. |
| End·7 | `[data-page-guide="biz-create-name"]` | Business created | Your business profile is live. Start the Showroom Creation tour to build your mini website. |

---

### TOUR-INVENTORY — Business Inventory Page
**Route:** `/business/inventory`  
**Purpose:** Manage all products for a business  
**Roles:** Business owners  
**Chapters:** 1 · Product list, 2 · Filters, 3 · Actions

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="inventory-header"]` `views/BusinessInventory.tsx` **[ADD]** | Your inventory | Every product you have listed for this business is shown here. |
| Ch1·2 | `[data-page-guide="inventory-add-btn"]` `views/BusinessInventory.tsx` **[ADD]** | Add a product | Tap Add Product to list a new item in your inventory and Marketplace. |
| Ch2·3 | `[data-page-guide="inventory-search"]` `views/BusinessInventory.tsx` **[ADD]** | Search products | Type a name to filter your product list. |
| Ch2·4 | `[data-page-guide="inventory-filters"]` `views/BusinessInventory.tsx` **[ADD]** | Filter by status | Show all products, or filter by Active, Draft, or Out of Stock. |
| Ch3·5 | `[data-page-guide="inventory-product-card"]` `views/BusinessInventory.tsx` **[ADD]** | Product card | Each card shows price, stock level, and status. Tap to edit or manage the product. |
| Ch3·6 | `[data-page-guide="inventory-bulk-actions"]` `views/BusinessInventory.tsx` **[ADD]** | Bulk actions | Select multiple products to publish, archive, or delete them together. |
| End·7 | `[data-page-guide="inventory-header"]` | Inventory done | Add your first product to make it available in the Marketplace. |

---

### TOUR-PRODUCT-CREATE — Create/Edit Product Page
**Route:** `/products/create` and `/products/edit`  
**Purpose:** Add or update a product listing  
**Roles:** Business owners  
**Chapters:** 1 · Basic info, 2 · Images, 3 · Pricing and stock, 4 · Publish

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="product-create-title"]` `views/ProductCreate.tsx` **[ADD]** | Product name | Enter a clear name that buyers will search for in the Marketplace. |
| Ch1·2 | `[data-page-guide="product-create-desc"]` `views/ProductCreate.tsx` **[ADD]** | Description | Describe the product in detail. Tap the AI button to generate a draft automatically. |
| Ch1·3 | `[data-page-guide="product-create-category"]` `views/ProductCreate.tsx` **[ADD]** | Category | Choose the right category so buyers find this product easily. |
| Ch2·4 | `[data-page-guide="product-create-images"]` `views/ProductCreate.tsx` **[ADD]** | Product images | Upload up to five photos. The first image is the main listing photo. |
| Ch3·5 | `[data-page-guide="product-create-price"]` `views/ProductCreate.tsx` **[ADD]** | Set the price | Enter the price buyers will pay. Leave blank to enable Request Price mode. |
| Ch3·6 | `[data-page-guide="product-create-stock"]` `views/ProductCreate.tsx` **[ADD]** | Stock quantity | Enter how many you have available. We alert you when stock runs low. |
| Ch4·7 | `[data-page-guide="product-create-publish"]` `views/ProductCreate.tsx` **[ADD]** | Publish or save draft | Publish makes the product live. Save as Draft hides it until you are ready. |
| End·8 | `[data-page-guide="product-create-title"]` | Product done | Your product is live in the Marketplace. Check Inventory to manage it. |

---

### TOUR-SUBSCRIPTION — Business Subscription Page
**Route:** `/business/subscription`  
**Purpose:** Choose and purchase a Nodbusiness Pro plan  
**Roles:** Business owners  
**Chapters:** 1 · Plan overview, 2 · Plan selection, 3 · Checkout

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="sub-header"]` `views/BusinessSubscription.tsx` **[ADD]** | Nodbusiness Pro | Upgrade to unlock promoted posts, priority support, and advanced analytics. |
| Ch1·2 | `[data-page-guide="sub-features"]` `views/BusinessSubscription.tsx` **[ADD]** | What's included | Each plan tier lists exactly which features are unlocked with it. |
| Ch2·3 | `[data-page-guide="sub-plans"]` `views/BusinessSubscription.tsx` **[ADD]** | Choose a plan | Select the monthly or annual plan that suits your business size. Annual saves you money. |
| Ch3·4 | `[data-page-guide="sub-checkout-btn"]` `views/BusinessSubscription.tsx` **[ADD]** | Proceed to payment | Tap Subscribe to go to the secure payment screen. |
| End·5 | `[data-page-guide="sub-header"]` | Subscription done | After payment, your Pro badge and features activate immediately. |

---

### TOUR-REFERRAL — Referral Page
**Route:** `/referral`  
**Purpose:** Share your referral code and track sign-ups  
**Roles:** Authenticated  
**Chapters:** 1 · Referral code, 2 · Stats, 3 · Share

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="referral-code"]` `views/Referral.tsx` **[ADD]** | Your referral code | Share this unique code with friends. When they sign up using it, both of you earn a reward. |
| Ch1·2 | `[data-page-guide="referral-copy"]` `views/Referral.tsx` **[ADD]** | Copy your link | Tap Copy to copy your personal referral link to share anywhere. |
| Ch2·3 | `[data-page-guide="referral-stats"]` `views/Referral.tsx` **[ADD]** | Referral stats | See how many people signed up using your code and the rewards you have earned. |
| Ch3·4 | `[data-page-guide="referral-share"]` `views/Referral.tsx` **[ADD]** | Share with friends | Use the share buttons to send your link via WhatsApp, Telegram, or any app. |

---

### TOUR-SCORECARD — Scorecard Page
**Route:** `/scorecard`  
**Purpose:** Gamified platform engagement score — badges, streaks, progress  
**Roles:** Authenticated  
**Chapters:** 1 · Score, 2 · Badges, 3 · Milestones

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="scorecard-score"]` `views/Scorecard.tsx` **[ADD]** | Your score | Your Nodbusiness score reflects how active and engaged you are on the platform. |
| Ch1·2 | `[data-page-guide="scorecard-streak"]` `views/Scorecard.tsx` **[ADD]** | Activity streak | Log in and take actions every day to build and maintain your streak. |
| Ch2·3 | `[data-page-guide="scorecard-badges"]` `views/Scorecard.tsx` **[ADD]** | Earned badges | Badges are awarded for reaching milestones. Tap a badge to see how you earned it. |
| Ch3·4 | `[data-page-guide="scorecard-milestones"]` `views/Scorecard.tsx` **[ADD]** | Next milestones | See what actions you need to take to earn your next badge or level up. |
| End·5 | `[data-page-guide="scorecard-score"]` | Scorecard done | Share your badges on the Feed to let your network know about your achievements. |

---

### TOUR-COUPONS — Coupons Page
**Route:** `/coupons`  
**Purpose:** Create and manage discount coupons for a business  
**Roles:** Business owners  
**Chapters:** 1 · Coupon list, 2 · Create coupon

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="coupons-header"]` `views/CouponsManage.tsx` **[ADD]** | Coupons and discounts | Create promo codes that buyers enter at checkout for a discount. |
| Ch1·2 | `[data-page-guide="coupons-list"]` `views/CouponsManage.tsx` **[ADD]** | Your coupons | Active, expired, and draft coupons are listed here with their codes and usage count. |
| Ch2·3 | `[data-page-guide="coupons-create-btn"]` `views/CouponsManage.tsx` **[ADD]** | Create a coupon | Tap New Coupon to set a code, discount amount, and expiry date. |
| Ch2·4 | `[data-page-guide="coupons-usage"]` `views/CouponsManage.tsx` **[ADD]** | Track usage | See how many times each code has been used and how much discount was given. |

---

### TOUR-PRODUCT-SCAN — Quick Scan Page
**Route:** `/products/scan`  
**Purpose:** Barcode / QR scan to find a product in the Marketplace  
**Roles:** Authenticated  
**Chapters:** 1 · Scanner

#### Steps

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="scan-viewfinder"]` `views/ProductQuickScan.tsx` **[ADD]** | Scan a product | Point your camera at a product barcode or QR code to find it instantly in the Marketplace. |
| Ch1·2 | `[data-page-guide="scan-torch"]` `views/ProductQuickScan.tsx` **[ADD]** | Torch |Tap the torch button to turn on your camera light in dim conditions. |
| Ch1·3 | `[data-page-guide="scan-result"]` `views/ProductQuickScan.tsx` **[ADD]** | Scan result | When a product is found, a card appears with its name, price, and a link to the detail page. |

---

### TOUR-ADMIN — Admin Dashboard
**Route:** `/admin`  
**Purpose:** Platform management — users, flags, moderation  
**Roles:** Admin only  
**Chapters:** 1 · Overview, 2 · User management, 3 · Feature flags, 4 · Moderation

#### Steps (admin-only — never shown to regular users)

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="admin-header"]` `views/Admin.tsx` **[ADD]** | Admin dashboard | Platform-wide controls for users, content, feature flags, and system health. |
| Ch1·2 | `[data-page-guide="admin-stats"]` `views/Admin.tsx` **[ADD]** | Platform stats | Total users, active businesses, daily orders, and system status at a glance. |
| Ch2·3 | `[data-page-guide="admin-users"]` `views/Admin.tsx` **[ADD]** | User management | Search, view, suspend, or delete any user account from this table. |
| Ch3·4 | `[data-page-guide="admin-flags"]` `views/Admin.tsx` **[ADD]** | Feature flags | Enable or disable platform features for all users or specific rollout percentages. |
| Ch4·5 | `[data-page-guide="admin-moderation"]` `views/Admin.tsx` **[ADD]** | Content moderation | Review reported posts and take action — approve, remove, or escalate. |

---

### TOUR-DEVOPS — DevOps Live Feed Page
**Route:** `/admin/devops`  
**Purpose:** Real-time error feed, server health, and deployment logs  
**Roles:** Admin only  
**Chapters:** 1 · Error feed, 2 · Health checks

#### Steps (admin-only)

| Step | Target | Hook | Title | Body |
|------|--------|------|-------|------|
| Ch1·1 | `[data-page-guide="devops-header"]` `views/DevOps.tsx` **[ADD]** | DevOps live feed | Real-time server errors, warnings, and events stream here as they happen. |
| Ch1·2 | `[data-page-guide="devops-errors"]` `views/DevOps.tsx` **[ADD]** | Error log | Each entry shows the error type, route, and timestamp. Tap to see the full stack trace. |
| Ch2·3 | `[data-page-guide="devops-health"]` `views/DevOps.tsx` **[ADD]** | Health checks | Service status for the API, database, Redis, and storage are shown here. |

---

## PART F: FLOW TOUR SPECIFICATIONS

### FLOW-ONBOARD — New User First-Time Flow (cross-page)
Steps that span pages in order:

| # | Page | Tour ref | Step goal |
|---|------|----------|-----------|
| 1 | `/landing` | TOUR-LANDING | See the platform overview |
| 2 | `/register` | TOUR-REGISTER | Create an account and verify email |
| 3 | `/onboarding` | TOUR-ONBOARD | Set name and profile type |
| 4 | `/feed` | TOUR-FEED | Understand the home feed |
| 5 | `/profile` | TOUR-PROFILE-OWN | See own profile |
| 6 | `/showroom/create` | TOUR-SHOWROOM-CREATE | (business accounts) create showroom |

Auto-advance: each tour's Done button redirects to the next page in the flow. The redirect URL is embedded as a `?next=` param so the flow can resume if interrupted.

### FLOW-PURCHASE — Buyer Purchase Flow
`/marketplace` → product detail → `/cart` → checkout → `/orders/success`

| # | Tour ref | Step goal |
|---|----------|-----------|
| 1 | TOUR-MARKETPLACE | Find a product |
| 2 | TOUR-PRODUCT-DETAIL | Review and add to cart |
| 3 | TOUR-CART | Review cart and proceed |
| 4 | system checkout | Payment (Stripe/Chapa — no tour overlay in iframe) |
| 5 | TOUR-ORDER-SUCCESS | Confirm the order arrived |

### FLOW-SELL — Seller Setup Flow
`/business/create` → `/products/create` → `/showroom/create` → `/analytics`

| # | Tour ref | Step goal |
|---|----------|-----------|
| 1 | TOUR-BIZ-CREATE | Register a business |
| 2 | TOUR-PRODUCT-CREATE | List first product |
| 3 | TOUR-SHOWROOM-CREATE | Build showroom |
| 4 | TOUR-ANALYTICS | Read first stats |

---

## PART G: ROLE AND PLAN VARIANTS

| Role | Tours available | Extra steps | Hidden steps |
|------|----------------|-------------|--------------|
| Guest (unauthenticated) | TOUR-LANDING, TOUR-MARKETPLACE, TOUR-SEARCH, TOUR-SHOWROOM-VIEW | Feed guest banner step | Create post, filter bar, bookmark steps |
| Authenticated user | All non-admin, non-business-owner tours | — | Admin tours |
| Business owner | All authenticated + TOUR-BIZ-CREATE, TOUR-INVENTORY, TOUR-PRODUCT-CREATE, TOUR-SHOWROOM-CREATE, TOUR-ANALYTICS, TOUR-COUPONS, TOUR-SUBSCRIPTION | Seller actions step in TOUR-ORDERS | — |
| Demo account (`is_demo: true`) | Same as authenticated user; demo-mode banner step added to TOUR-FEED | Demo badge step on TOUR-PROFILE-OWN | Subscription/billing tours |
| Admin | All + TOUR-ADMIN, TOUR-DEVOPS | Feature flags step, user management steps | — |

---

## PART H: STATE VARIANTS

| State | Handling |
|-------|---------|
| Empty list (no orders, no products, no messages) | Target the empty-state CTA button instead of the list; step copy: "Nothing here yet — tap [action] to add your first [item]." |
| Loading skeleton | Wait up to 2 s for real content; if still loading, skip to next step |
| Error state | Skip the affected step, show fallback: "This section could not load. Check your connection and try again." |
| First-time use | Auto-start on first page visit (after flag check) |
| Returning user | Launcher button only; no auto-start unless tour was never completed |
| Permission denied (wrong role) | Step is excluded at build time via role check; never shown |
| Offline | Tours run; steps targeting network-dependent content use fallback copy |
| Dark mode | All styles via CSS variables; overlay and card inherit theme automatically |
| Mobile (< md = 768 px) | Sidebar steps replaced by mobile-navigation steps; card width = `calc(100vw - 2rem)`; card placed above bottom nav bar |

---

## PART I: IMPLEMENTATION OUTPUT

### 1. New `data-page-guide` hooks to add

Every `**[ADD HOOK]**` in Part E represents one attribute to add to an existing element.
Summary of files needing changes:

| File | Hooks to add |
|------|-------------|
| `app/landing/page.tsx` | `landing-preferences`, `landing-register`, `landing-signin`, `landing-stats`, `landing-modules`, `landing-cta-section`, `landing-demo-btn`, `landing-guest` |
| `components/landing/LandingControls.tsx` | `landing-preferences` (root element) |
| `components/landing/TryDemoButton.tsx` | `landing-demo-btn` (root element) |
| `views/Register.tsx` | `register-page`, `register-google`, `register-email`, `register-password`, `register-confirm`, `register-terms`, `register-submit`, `register-otp`, `register-resend` |
| `views/Login.tsx` | `login-google`, `login-email`, `login-password`, `login-forgot`, `login-submit`, `login-register-link` |
| `views/Onboarding.tsx` | `onboard-welcome`, `onboard-name`, `onboard-type`, `onboard-continue` |
| `views/Home.tsx` | `feed-guest-banner`, `feed-filters`, `feed-refresh`, `feed-posts`, `feed-create-post` |
| `views/Marketplace.tsx` | already has all hooks ✓ |
| `views/Search.tsx` | `search-results`, `search-empty` |
| `views/Profile.tsx` | `profile-header`, `profile-avatar`, `profile-verified`, `profile-view-toggle`, `profile-edit-btn`, `profile-create-showroom` |
| `components/profile/PersonalProfile.tsx` | `profile-personal-tab` |
| `components/profile/BusinessProfile.tsx` | `profile-business-tab` |
| `views/ProfileEdit.tsx` | `profile-edit-avatar`, `profile-edit-cover`, `profile-edit-name`, `profile-edit-bio`, `profile-edit-location`, `profile-edit-ticker` |
| `views/Orders.tsx` | `orders-header`, `orders-tabs`, `orders-list`, `orders-status-badge`, `orders-detail-expand`, `orders-invoice-btn`, `orders-return-btn`, `orders-seller-actions`, `orders-delivery-timeline` |
| `views/Wallet.tsx` | `wallet-balance`, `wallet-currency`, `wallet-transactions`, `wallet-filter`, `wallet-topup`, `wallet-payout` |
| `views/Messages.tsx` | `messages-header`, `messages-list`, `messages-search`, `messages-new` |
| `views/ChatRoom.tsx` | `chat-header`, `chat-messages`, `chat-input`, `chat-attachments` |
| `views/Notifications.tsx` | `notif-header`, `notif-list`, `notif-unread`, `notif-mark-all` |
| `views/ProductDetail.tsx` | `product-images`, `product-title`, `product-category`, `product-add-cart`, `product-buy-now`, `product-request`, `product-seller` |
| `views/Cart.tsx` | `cart-items`, `cart-quantity`, `cart-remove`, `cart-summary`, `cart-checkout` |
| `views/Showrooms.tsx` | `showrooms-header`, `showrooms-search`, `showrooms-grid` |
| `views/ShowroomView.tsx` | `showroom-hero`, `showroom-sections`, `showroom-products`, `showroom-contact` |
| `views/ShowroomCreate.tsx` | `showroom-create-name`, `showroom-create-category`, `showroom-builder`, `showroom-section-editor`, `showroom-preview`, `showroom-publish` |
| `views/ShowroomWizard.tsx` | `showroom-templates` |
| `views/BusinessCreate.tsx` | `biz-create-name`, `biz-create-category`, `biz-create-description`, `biz-create-logo`, `biz-create-color`, `biz-create-submit` |
| `views/BusinessInventory.tsx` | `inventory-header`, `inventory-add-btn`, `inventory-search`, `inventory-filters`, `inventory-product-card`, `inventory-bulk-actions` |
| `views/ProductCreate.tsx` | `product-create-title`, `product-create-desc`, `product-create-category`, `product-create-images`, `product-create-price`, `product-create-stock`, `product-create-publish` |
| `views/BusinessSubscription.tsx` | `sub-header`, `sub-features`, `sub-plans`, `sub-checkout-btn` |
| `views/Referral.tsx` | `referral-code`, `referral-copy`, `referral-stats`, `referral-share` |
| `views/Scorecard.tsx` | `scorecard-score`, `scorecard-streak`, `scorecard-badges`, `scorecard-milestones` |
| `views/CouponsManage.tsx` | `coupons-header`, `coupons-list`, `coupons-create-btn`, `coupons-usage` |
| `views/ProductQuickScan.tsx` | `scan-viewfinder`, `scan-torch`, `scan-result` |
| `views/Explore.tsx` | `explore-header`, `explore-featured`, `explore-trending`, `explore-categories` |
| `views/HashtagFeed.tsx` | `hashtag-header`, `hashtag-follow-btn`, `hashtag-posts` |
| `views/BusinessAnalytics.tsx` | `analytics-header`, `analytics-tiles`, `analytics-chart`, `analytics-top-posts` |
| `views/Admin.tsx` | `admin-header`, `admin-stats`, `admin-users`, `admin-flags`, `admin-moderation` |
| `views/DevOps.tsx` | `devops-header`, `devops-errors`, `devops-health` |
| `views/Friends.tsx` | `friends-header`, `friends-tabs`, `friends-suggestions`, `friends-follow-btn` |
| `views/Bookmarks.tsx` | `bookmarks-header`, `bookmarks-tabs`, `bookmarks-list` |
| `views/NearbyMap.tsx` | `nearby-map`, `nearby-locate`, `nearby-filters`, `nearby-marker` |
| `views/AccountSettings.tsx` | `settings-header`, `settings-email`, `settings-password`, `settings-language`, `settings-theme`, `settings-notifications`, `settings-danger` |
| `views/PrivacyAndSecurity.tsx` | `privacy-header`, `privacy-visibility`, `privacy-blocked`, `privacy-export` |

### 2. `PageGuide.tsx` extensions needed

Add the following to `buildSteps()` for each new page:

```typescript
// Pattern — add one block per new page:
if (pathname === '/orders') return [
  make('ordersHeader',          '[data-page-guide="orders-header"]'),
  make('ordersTabs',            '[data-page-guide="orders-tabs"]'),
  make('ordersList',            '[data-page-guide="orders-list"]'),
  make('ordersStatusBadge',     '[data-page-guide="orders-status-badge"]'),
  make('ordersDetailExpand',    '[data-page-guide="orders-detail-expand"]'),
  make('ordersInvoiceBtn',      '[data-page-guide="orders-invoice-btn"]'),
  make('ordersReturnBtn',       '[data-page-guide="orders-return-btn"]'),
  make('ordersSellerActions',   '[data-page-guide="orders-seller-actions"]'),
  make('ordersDeliveryTimeline','[data-page-guide="orders-delivery-timeline"]'),
];
// ... repeat for every page above
```

Add copy keys to the `copy.en.steps` and `copy.am.steps` objects:

```typescript
// English copy additions (excerpt):
ordersHeader:           ['Your orders',             'Every order you placed or received as a seller appears here.'],
ordersTabs:             ['Buyer and seller tabs',   'Switch between orders you placed and orders you received.'],
// ... one entry per step
```

### 3. Per-page persistence keys

Replace the single global `nodbusiness-page-guide-seen` with per-tour keys:

```typescript
// In PageGuide.tsx, replace:
localStorage.getItem('nodbusiness-page-guide-seen')
// With:
localStorage.getItem(`nodbusiness-tour-${tourId}-done`)

// Where tourId is derived from the current pathname, e.g.:
const tourId = pathname === '/feed' ? 'FEED'
  : pathname === '/orders' ? 'ORDERS'
  : pathname.startsWith('/messages/') ? 'CHATROOM'
  : 'GENERIC';
```

### 4. Feature flag enablement

To activate tours platform-wide set in the backend:
```
FF_PAGE_GUIDED_TOURS=true
```
Or via the admin panel at `/admin` → Feature Flags → `page_guided_tours` → enabled: true, rollout: 100.

---

## PART J: QA CHECKLIST

For each tour, verify the following:

| Check | Method |
|-------|--------|
| Every step's target element exists on the page | Open page, check `document.querySelector('[data-page-guide="X"]')` in console |
| Spotlight cutout frames the correct element | Visual inspection on desktop + mobile |
| Card placement does not obscure the target | Visual at 375 px, 768 px, 1280 px widths |
| Back/Next advance correctly | Click through all steps |
| Esc closes the tour | Keyboard test |
| Skip saves `nodbusiness-tour-<ID>-done` | Check localStorage after skip |
| Done saves `nodbusiness-tour-<ID>-done` | Check localStorage after Done |
| Tour does not auto-start on revisit | Reload page; check launcher button only |
| Launcher button triggers tour restart | Click launcher; tour starts at step 1 |
| Mobile bottom nav does not obscure card | Test at 375 px with bottom nav visible |
| Guest-only steps hidden from auth users | Log in; confirm guest banner step absent |
| Admin steps hidden from regular users | Regular account; confirm `/admin` tour not accessible |
| Business-owner steps hidden from non-owners | Regular account; confirm seller-actions step absent |
| Missing target skipped gracefully | Remove attribute temporarily; confirm step skips, no error |
| Dark mode: overlay and card readable | Toggle dark mode mid-tour |
| Right-to-left / Amharic: text fits in card | Switch language to Amharic; run tour |
| Feature flag OFF: launcher hidden | Set `FF_PAGE_GUIDED_TOURS=false`; confirm no launcher |
| Feature flag ON: launcher visible | Set flag ON; confirm launcher bottom-left |

---

*End of Master Tour Prompt — Nodbusiness · October 2026*
