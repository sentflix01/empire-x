# New-user audit: first visit → first success (15 Nov 2026)

**App:** Nodbusiness (https://nodbusiness.vercel.app) — social + commerce: post, follow, build a business showroom, buy and sell.
**Users:** non-technical, global, mobile-first. **Stack:** Next.js 16 / React, Express + Postgres + Redis, Vercel.
**Goal tested:** anyone can sign up and reach a first success in under 60 seconds, without confusion.

## After the fixes (same journey, same phone profile, re-run 15 Nov 2026)

| What | Before | After |
|---|---|---|
| "Create account" with the terms box unticked | grey button, nothing happens, no message, unreachable by keyboard | the button works; "Tick the box to agree…" appears under the box, announced, with the box focused |
| Fields on sign-up | email, password, confirm password, terms | email, password (show/hide, rule always visible), terms |
| Typo email `selam@gmial` | accepted | "Enter an email like name@example.com." plus "Did you mean selam@gmail.com?" (one tap) |
| Error announcements | none announced, no `aria-invalid` | every error `role="alert"` and linked to its field (`aria-invalid`, `aria-describedby`) |
| Wrong code | stays in the boxes | checked as soon as 6 digits are in, then the boxes clear |
| After the code | feed with a "Loading map…" spinner, then a jump to `/onboarding` 1–3 s later | **straight to "Welcome! What should people call you?"** (one field), then the feed |
| Post box on the first feed | 585 px down a 664 px screen | **93 px** from the top |
| Floating buttons on sign-up and sign-in | covered the email and password fields | none on these pages |
| Sign-in without a password | not offered | "Email me a sign-in code": signed in **0.8 s** after typing the code |
| Used email | "An account with this email already exists" (dead end) | "This email already has an account. Sign in · Forgot password?" |
| Header initial for a new account | "G" (header) / "E" (post box) | the person's initial everywhere |
| Guest feed | 2 failed calls (401) | stories only for signed-in people (the 401 call is gone) |
| Languages in every first download | all 4 (≈ 112 KB raw) | English only; others load when chosen |
| Page titles | "Nodbusiness" on sign-up, sign-in and feed | "Create account · Sign in · Feed | Nodbusiness", with canonical addresses |
| axe WCAG 2.2 AA (sign-up, sign-in, forgot, error states, code screen; phone and desktop; light and dark) | clean on the base pages | **20/20 clean**, error states included |
| Journey findings | 4 (disabled button, unannounced errors ×2, logout) | **0** |

- **Machine time:** account at 8.7 s, first post at 14.3 s, both about the same as before. The time a person saves is in the steps removed: the confirm field, hunting for the tick box, deleting a wrong code, the surprise redirect, the four extra onboarding fields, and scrolling to the post box.
- **Estimated time for a person:** **≈ 40–55 s** by email (was 75–110 s) and **≈ 15–25 s** with Google.
- **Not done: NU-15** (autofocus on the email field). It would put keyboard users past the "Skip to main content" link, which the accessibility tests require first.

## How it was tested (evidence, not guesses)

| Where | What | Script |
|---|---|---|
| **Production, read-only** (no account created, nothing submitted) | first visit on an iPhone 13 profile, Slow 4G and unthrottled; Core Web Vitals; transfer sizes; headers; robots / sitemap; axe WCAG 2.2 AA on `/`, `/register`, `/login`, `/forgot-password`, `/feed`; keyboard order; what sign-up and login offer | `prod-first-visit.mjs`, inline axe and size runs |
| **Local stack, same code** | the complete journey on a phone: landing → Start free → sign-up edge cases → email code (read from the dev mail log, as from an inbox) → first screen → onboarding → first post → log out → wrong / right password → forgot → reset → duplicate sign-up; API limits (wrong code ×11, wrong login ×22) | `new-user-journey.mjs` |

**Not tested, and why:**
- Production email delivery and speed (no real sign-up on the live site).
- Production cookie flags after sign-in (needs a live account; locally `refresh_token` is httpOnly and SameSite=Lax, and Secure is off only because local is http).
- INP on a real device (only approximated in a headless browser).
- RTL languages (none are offered).
- Real screen readers (only automated axe and DOM checks).

## A. Executive summary

**Score: 66 / 100.**

**Is it simple enough for anyone to sign up and use? Not yet.**
- The foundations are strong: a clear one-line promise, one obvious "Start free", Google sign-up, a fast first paint, solid security, no tracking and a clean axe run.
- **Five frictions** push a real person past 60 seconds and cause confusion at the worst moments:
  1. **"Create account" is greyed out and does nothing** until a small terms box is ticked. Nothing says why, and keyboard users can't even reach it.
  2. **On a phone, the floating "Page guide" and AI buttons cover the email and password fields**, including the show-password eye.
  3. After verifying, the user lands on the feed, sees a **full-screen "Loading map…" spinner**, then **is yanked to `/onboarding` 1–3 s later**. Anything they started typing is lost.
  4. **Sign-up, login and onboarding are English-only**, even though the landing page offers a language switch.
  5. Errors are **not announced** to screen readers and not tied to their fields. A typo'd email (`selam@gmial`) is accepted, and a wrong code stays in the boxes.

**Time to account (estimated for a person):**
- Email: **≈ 75–110 s** (typing 3 fields, finding the tick box, switching to the mail app for the code).
- Google: **≈ 20–30 s**, plus onboarding.

**Machine time:** account in 8.4 s, first post in 13.8 s, so the system itself is not the bottleneck. The fixes in E bring a person to **≈ 35–45 s** with email and **< 20 s** with Google.

## B. Scorecard

| Area | Score | Why |
|---|---|---|
| Simplicity | 6/10 | 3 fields + a checkbox + a code + a 5-field onboarding (1 required); the disabled button and the surprise redirect confuse |
| Speed (to first value) | 6/10 | ≈ 90 s for a person with email; < 30 s with Google |
| UX | 6/10 | clear landing; but dead-looking button, covered fields, loading spinner as first screen, composer below the fold |
| Accessibility | 7/10 | axe clean on 6 pages, logical Tab order, skip link; but dynamic errors not announced / not linked, disabled submit unreachable by keyboard, generic page titles |
| Mobile | 6/10 | phone-first layout, 16 px inputs; but floating buttons over fields, submit below the fold (top at 664 of 664 px) |
| Security | 9/10 | NIST-style password policy (length + common list + not your email), hashed codes and reset tokens, 10-try code lockout, login lock after 5, sessions revoked on reset, pre-registration hijack guard, strict CSP with nonces, HSTS preload, frame DENY |
| Performance | 7/10 | unthrottled LCP 0.83 s, CLS 0; Slow 4G LCP 3.4 s (needs improvement), JS 310–528 KB compressed per page |
| Internationalisation | 4/10 | 4 locales exist, but auth + onboarding are hard-coded English; no RTL; free-text phone with no country hint |
| Trust | 7/10 | no third-party scripts or cookies before sign-in (no banner needed), HTTPS, terms + privacy on sign-up; landing has no Privacy link; generic titles; OG image is an SVG |

## C. New-user journey log (phone, local stack, same code as production)

| # | t (s) | Clicks / keys | What I did | What happened | Friction |
|---|---|---|---|---|---|
| 1 | 1.8 | 0 / 0 | Open the app | `/landing`. h1 "Build it. Connect & share it. Buy or sell it." Visible actions: Sign in · **Start free** · Try demo | none. Clear in 5 s |
| 2 | 2.6 | 1 / 0 | Tap **Start free** | `/register`: Google button, Email, Password, Confirm password, terms box. **Nothing focused.** Password rule only as placeholder text | the keyboard doesn't open; the submit button is at the bottom edge of the screen |
| 3 | 2.9 | 1 / 21 | Fill all fields, tap **Create account** | **Nothing happens**: the button is disabled until the 16×16 px terms box is ticked, and no message says so | **High**: "the button is broken" moment |
| 4 | 3.0 | 3 / 21 | Tick terms; typo email `selam@gmial`, password `short` | Only the browser's native bubble: "Please lengthen this text to 8 characters…". **The typo email passes.** | native bubble disappears and isn't styled; no typo help |
| 5 | 4.6 | 5 / 93 | Passwords don't match | Red box "Passwords do not match." **Not announced** (no role=alert), **no aria-invalid** on the field | screen-reader users get silence |
| 6 | 6.4 | 7 / 504 | Valid email typed in CAPITALS with spaces | Normalised. Code screen after **0.87 s**: "Check your email · We sent a 6-digit code to …" | good |
| 7 | 7.1 | 8 / 510 | Enter a wrong code | "Invalid verification code" (not announced). **The 6 wrong digits stay in the boxes** | must delete 6 digits by hand |
| 8 | 8.0 | 10 / 522 | Enter the right code | → `/feed` in 0.19 s. **First screen: a full-page "Loading map…" spinner** | first impression after sign-up is a loader |
| 9 | 11.4 | 10 / 522 | (waited) | **Jumped from the feed to `/onboarding`** by itself (`AppLayout` redirects when no profile exists) | **High**: anything typed is lost; disorienting |
| 10 | 11.7 | — | Onboarding | "Personal Information": Full Name*, Headline, Bio, Location, Phone (only the name is required) | 5 fields look like work; fine once you see 4 are optional |
| 11 | 12.1 | 11 / 534 | Continue | → `/feed`. "What's happening?" box starts **585 px** down a 664 px screen, under a promo video banner, an announcement strip and filter chips | first action is below the fold |
| 12 | 13.8 | 13 / 570 | Write and post | Post saved (verified in the database) | **First value at 13.8 s machine time** |
| 13 | 15.8 | 15 / 570 | Log out | Under **More** in the bottom bar → `/landing` | ok (2 taps) |
| 14 | 18.2 | 16 / 613 | Wrong password | "Invalid email or password" (generic: good). Not announced | — |
| 15 | 22.5 | — | Forgot password | "We'll send you a link…"; always shows success (no account enumeration) | good |
| 16 | 25.9 | — | Open the reset link, set a new password | → `/login`. **The other device's session is now signed out (401)** | good security |
| 17 | 28.6 | — | Sign up again with the same email | "An account with this email already exists" | reveals that the account exists; offers no "Sign in / Reset password" link |
| 18 | API | — | Wrong code ×11 | 422 each; the code is cleared after 10 wrong tries | good |
| 19 | API | — | Wrong login ×22 from one address | 401 ×5, then **429** | good |

**Production first visit (iPhone 13):**

| Page | Network | TTFB | FCP / LCP | CLS | Transfer (JS) |
|---|---|---|---|---|---|
| `/` | Slow 4G | 1,457 ms | 3,444 ms | 0.002 | 561 KB (384 KB JS) |
| `/` | unthrottled | 514 ms | 828 ms | 0 | |
| `/register` | unthrottled | 341 ms | 780 ms | 0 | 547 KB (310 KB JS, 121 KB video) |
| `/login` | unthrottled | 311 ms | 668 ms | 0 | |
| `/feed` (guest) | unthrottled | 367 ms | 696 / 1,168 ms | 0.065 | 868 KB (528 KB JS, 184 KB video) |

- **Guest `/feed`:** 2 failed calls, `401 /api/stories` and `401 /api/auth/refresh`, both showing as console errors.
- **Google sign-up:** rendered on production. **No magic link or passwordless option.**

## D. Issues (by severity)

| ID | Sev | Area | Issue | Steps | Expected vs actual | Impact | Fix |
|---|---|---|---|---|---|---|---|
| NU-1 | High | Onboarding | New users land on the feed, then are redirected to `/onboarding` 1–3 s later | Sign up, verify, watch | Expected: go straight to "What's your name?". Actual: feed (spinner), then a jump to onboarding; anything typed is lost | confusion at the "aha" moment; lost input | after verify, route to `/onboarding` when there is no profile (or create the profile at verify and ask the name inline) |
| NU-2 | High | Signup | "Create account" is disabled until terms are ticked, and nothing says why; keyboard users can't reach it | Fill the 3 fields, tap Create account | Expected: the button works and says "Tick the box to agree to the terms". Actual: nothing happens | drop-off; WCAG 3.3.1 | keep it enabled; on submit, focus the box with an inline message; or use "By creating an account you agree…" with no box |
| NU-3 | High | Mobile | Floating Page guide and AI buttons cover the Email and Password fields and the show-password eye on `/register` (and `/login`) | open `/register` on a 390 px phone | Expected: nothing over form fields. Actual: two 56 px buttons over the right edge of both inputs | can't tap the eye; looks broken | hide launchers on auth routes (`/register`, `/login`, `/forgot-password`, `/reset-password`, `/onboarding`) |
| NU-4 | High | i18n | Sign-up, login and onboarding are hard-coded English (17 / 12 / 13 strings), though the landing page offers EN / አማ / FR / SW | switch the language on landing, tap Start free | Expected: sign-up in the chosen language. Actual: English | non-English users stall at the most important form | move the strings to `locales/*.json` (keys exist for some); carry the choice through |
| NU-5 | Medium | A11y | Errors (passwords don't match, invalid code, wrong password) are not announced and not linked to fields | submit a mismatch | Expected: `role="alert"` plus `aria-invalid`/`aria-describedby`. Actual: a silent red box | WCAG 4.1.3, 3.3.1 | add both |
| NU-6 | Medium | Signup | Password length only via the browser's native bubble; the rule shows only as placeholder text | type `short`, submit | Expected: a persistent hint "8+ characters" and an inline error. Actual: a transient browser bubble | confusing, inconsistent styling | show the rule under the field; validate inline on blur |
| NU-7 | Medium | Signup | Typo emails accepted (`selam@gmial`): no domain-ending check, no "did you mean gmail.com?" | type it | the code goes to a dead address and the user waits forever | lost sign-ups | require a dot in the domain; suggest common-domain fixes |
| NU-8 | Medium | Verify | A wrong code stays in the 6 boxes; no paste hint | enter a wrong code | Expected: the boxes clear and focus returns to box 1. Actual: the user deletes 6 digits | friction | clear on error; auto-submit at 6 digits |
| NU-9 | Medium | First screen | After sign-up the first screen is a full-page "Loading map…" spinner | verify | Expected: a welcome with one next step. Actual: a spinner | weak first impression | show the feed skeleton; lazy-load the map below |
| NU-10 | Medium | Feed | The "What's happening?" box starts at 585 / 664 px, under a promo video, an announcement and chips | first feed on a phone | Expected: the first action above the fold. Actual: below it | slower first value | for new users, put the composer first; hide the promo once signed up |
| NU-11 | Medium | Mobile | On `/register` the submit button's top is at the bottom edge of a 664 px screen | open on iPhone 13 | Expected: email and submit visible together. Actual: the user must scroll | friction | shrink the logo and subtitle on phones; put Google and email in one compact card |
| NU-12 | Medium | Perf | 310–528 KB compressed JS per page; landing LCP 3.4 s on Slow 4G | Lighthouse-style Slow 4G | Expected: LCP < 2.5 s. Actual: 3.4 s | slow on mid-range phones | split large client components; defer the AI assistant and page guide until idle; check `@next/bundle-analyzer` |
| NU-13 | Medium | Reliability | Guest `/feed` calls `/api/stories` and `/api/auth/refresh` and gets 401s, logging console errors | open `/feed` signed out | Expected: no auth-only calls for guests. Actual: 2 × 401 | noise, wasted requests | skip these calls when there is no session hint |
| NU-14 | Medium | SEO / A11y | `/register`, `/login` and `/feed` are titled just "Nodbusiness"; no canonical URLs; the landing OG image is an SVG | view source | Expected: unique titles ("Create account · Nodbusiness"), canonical, a PNG/JPG OG image | WCAG 2.4.2; poor previews when shared | add `metadata.title` per route, `alternates.canonical`, and use `/opengraph-image` on the landing page |
| NU-15 | Low | Signup | No autofocus on Email | open `/register` | the keyboard should open on Email | one extra tap | `autoFocus` on desktop only, or focus after the first paint |
| NU-16 | Low | Signup | Confirm-password field, although show/hide exists | — | one password field with show/hide | 1 fewer field | remove Confirm; keep show/hide |
| NU-17 | Low | Signup | Duplicate email says "An account with this email already exists" with no next step | sign up twice | add "Sign in" / "Reset password" links | dead end | add the links (enumeration is already possible via this endpoint, so a helpful message costs nothing extra) |
| NU-18 | Low | Auth | No magic link or passwordless option (only Google + password) | — | an email-link option for people without Google | some drop-off | the OTP is already built; add "Email me a code to sign in" |
| NU-19 | Low | Trust | The landing page has no Privacy Policy link (only "Service agreement") | scroll the landing footer | a Privacy link in the footer | trust and compliance | add it |
| NU-20 | Low | UI | A new user's header avatar shows "G" while the post box shows "E" | sign up | the same initial everywhere (from the email until a name is set) | looks buggy | use one helper for initials |
| NU-21 | Low | i18n | Onboarding Phone is free text with no country code hint; Location is free text | onboarding | a country-aware phone input (+251 default) | inconsistent data | use a phone field with a country picker |

## E. Quick wins (biggest conversion gains)

| # | Fix | Effort |
|---|---|---|
| 1 | NU-1: after verify, go straight to a one-field "What's your name?" screen, then the feed | S |
| 2 | NU-2: never disable Create account; explain the missing tick inline (or drop the box: "By continuing you agree…") | S |
| 3 | NU-3: hide the floating launchers on auth and onboarding pages | S |
| 4 | NU-16: remove Confirm password (show/hide already exists) | S |
| 5 | NU-7: email domain check + "did you mean" | S |
| 6 | NU-8: clear the boxes on a wrong code; auto-submit at 6 digits | S |
| 7 | NU-5 / NU-6: inline, announced errors with `aria-invalid`; a persistent "8+ characters" hint | S |
| 8 | NU-9 / NU-10: no map spinner on first sign-in; composer first for new users | M |
| 9 | NU-4: translate sign-up, login and onboarding (strings to `locales/`) | M |
| 10 | NU-18: "Email me a code" sign-in (reuses the OTP) | M |

## F. What's already good (keep)

- **The landing page passes the 5-second test:** one h1 that says what it is, one primary action ("Start free"), Sign in and Try demo as secondary actions, and CLS 0.
- **Security is professional:**
  - a NIST-style password policy (8+ characters, common-password list, not your email);
  - hashed codes and reset tokens;
  - a 10-try code lockout and login 429 after 5 failures;
  - sessions revoked after a reset;
  - protection against someone pre-registering your email;
  - forgot-password always says "sent";
  - strict nonce-based CSP, HSTS preload, frame DENY, nosniff;
  - HTTP → HTTPS 308.
- **Privacy by default:** no third-party scripts, no analytics, no cookies before sign-in, so no cookie banner is needed.
- **Accessibility basics:** axe finds **no WCAG 2.2 AA violations** on six public pages, there is a skip link, the Tab order is logical, there are 16 px inputs on phones, and `autocomplete="email"` / `"new-password"` / `"one-time-code"` are set.
- **Speed and resilience:**
  - fast server responses (TTFB 0.3–0.5 s);
  - unthrottled LCP under 1 s;
  - email normalised (capitals and spaces);
  - a resend cooldown on the code.
- **Sign-in options and navigation:** Google sign-up on production, and Log out reachable in 2 taps on a phone.

## G. Roadmap

- **Now (this week):** NU-1, NU-2, NU-3, NU-5, NU-6, NU-7, NU-8, NU-16 (all S). A person then reaches an account in ≈ 35–45 s with email.
- **Next:**
  - NU-4 (translate auth and onboarding)
  - NU-9, NU-10 (first screen)
  - NU-11 (compact phone sign-up)
  - NU-13 (guest 401s)
  - NU-14 (titles, canonical, OG image)
  - NU-17, NU-19, NU-20
- **Later:**
  - NU-12 (JS budget: target < 200 KB on landing and sign-up; LCP < 2.5 s on Slow 4G)
  - NU-18 (passwordless sign-in)
  - NU-21 (country-aware phone)
  - RTL readiness if Arabic or Hebrew are planned
  - real-device INP and screen-reader passes

## H. Code-level suggestions (top fixes)

**NU-1, straight to onboarding after verify** (`views/Register.tsx`):

```ts
await completeLogin();
// New accounts have no profile yet: ask the name first instead of showing the
// feed and redirecting a moment later (AppLayout's check).
router.replace('/onboarding');
```

Then in `views/Onboarding.tsx`, show only **Your name** (required), with "Add more later" in place of the four optional fields.

**NU-2, never a dead button** (`views/Register.tsx`):

```tsx
const [termsError, setTermsError] = useState(false);
// in handleSubmit, instead of setError(...)
if (!agreed) { setTermsError(true); termsRef.current?.focus(); return; }
// button
<Button type="submit" disabled={loading} aria-describedby={termsError ? 'terms-error' : undefined}>Create account</Button>
{termsError && <p id="terms-error" role="alert" className="text-sm text-destructive">Tick the box to agree to the terms.</p>}
```

**NU-3, no floating buttons on auth pages** (`app/globals.css`, using the existing `data-floating-launcher` attribute):

```css
body:has([data-auth-page]) [data-floating-launcher] { display: none; }
```

Add `data-auth-page` to `AuthLayout`'s root and to Onboarding.

**NU-5, announced, linked errors:**

```tsx
<Input id="confirm" aria-invalid={mismatch || undefined} aria-describedby={mismatch ? 'confirm-error' : undefined} />
{mismatch && <p id="confirm-error" role="alert" className="text-sm text-destructive">Passwords do not match.</p>}
```

**NU-7, catch typo emails:**

```ts
const COMMON: Record<string, string> = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com', 'yahooo.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com' };
export function emailProblem(v: string): { error?: string; suggest?: string } {
  const [, domain = ''] = v.trim().toLowerCase().split('@');
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim())) return { error: 'Enter an email like name@example.com.' };
  return COMMON[domain] ? { suggest: v.replace(/@.*/, `@${COMMON[domain]}`) } : {};
}
```

**NU-8, clear and auto-submit the code:**

```tsx
<InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} onComplete={() => void handleVerify()} />
// in handleVerify's catch:
setOtpCode('');
```
