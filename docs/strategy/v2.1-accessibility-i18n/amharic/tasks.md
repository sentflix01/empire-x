# Amharic Translation — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Audit Hardcoded Strings

- [ ] Search for hardcoded English in all component files:
  ```bash
  # Find strings NOT using t() — look for JSX text content
  grep -r '"[A-Z][a-z]' frontend-next/components --include="*.tsx" | grep -v "className\|href\|src\|alt\|key\|id\|type\|name\|placeholder"
  ```
- [ ] Make a list of all hardcoded strings that need extraction to translation files
- [ ] Extract each to the appropriate namespace JSON file

---

## Step 2 — Organize Translation Files

- [ ] Ensure namespace structure is consistent:
  ```
  locales/
    en/
      common.json     ← shared: buttons, labels, status messages
      auth.tson       ← login, register, OTP
      feed.json       ← feed, posts, stories
      marketplace.json← products, cart, checkout, orders
      tasks.json      ← tasks, bids
      messages.json   ← chat, conversations
      profile.json    ← profile, settings
      showrooms.json  ← builder, public page
      discover.json   ← search, explore, nearby
      wallet.tson     ← wallet, payments
      jobs.json       ← jobs, applications
      events.json     ← events, tickets
      courses.json    ← courses, lessons
    am/
      [same structure]
  ```

---

## Step 3 — Translate common.json First

- [ ] All buttons: Save, Cancel, Edit, Delete, Confirm, Submit, Back, Next, Done, Skip
- [ ] All states: Loading, Error, Empty, Retry, No results
- [ ] All nav labels: Feed, Marketplace, Tasks, Messages, Notifications, Profile, Search, Nearby, Wallet
- [ ] All status: Open, Closed, Pending, Active, Completed, Cancelled, Draft
- [ ] Have translations reviewed by a native Amharic speaker before release

---

## Step 4 — Translate auth.tson

- [ ] "Create your account", "Sign in", "Verify your email", "Enter the 6-digit code"
- [ ] All error messages: "Email already taken", "Wrong OTP code", "Password too weak"
- [ ] All labels: Email, Password, Full name, Phone number

---

## Step 5 — Language Switcher

- [ ] Settings page: "Language" section with English / አማርኛ toggle
- [ ] Saving language preference: store in `localStorage` + user profile (`PUT /api/profiles/me { language: 'am' }`)
- [ ] Language change takes effect immediately (no page refresh)
- [ ] On login: detect user's saved language preference from profile

---

## Step 6 — Number & Date Formatting

- [ ] Currency: use `toLocaleString` with correct locale
  ```ts
  const formatETB = (amount: number) =>
    `ETB ${amount.toLocaleString('en-ET', { minimumFractionDigits: 2 })}`;
  ```
- [ ] Dates: use `date-fns/locale/am` for Amharic dates when language is set to Amharic
  ```ts
  import { am } from 'date-fns/locale';
  formatDistanceToNow(date, { locale: i18n.language === 'am' ? am : undefined })
  ```

---

## Step 7 — Verify

- [ ] Switch to Amharic → all nav labels change
- [ ] All buttons translate
- [ ] All error messages translate
- [ ] Language preference persists after page refresh
- [ ] Language preference persists after logout + login
- [ ] No English strings visible on any page in Amharic mode
- [ ] Dates show in Amharic format when language is set to Amharic
