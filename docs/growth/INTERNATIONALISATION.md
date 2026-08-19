# Nodbusiness — Internationalisation (i18n) & Globalisation Strategy

> How Nodbusiness expands from the reference market (Ethiopia) to the rest of Africa and globally.
> Ethiopian context preserved as a reference — all principles apply globally.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| i18n | Internationalization — designing software to support multiple languages/regions |
| l10n | Localization — adapting content for a specific locale |
| MAU | Monthly Active Users |
| GMV | Gross Merchandise Value |
| ETB | Ethiopian Birr — reference market currency |
| USD | United States Dollar |
| KES | Kenyan Shilling |
| NGN | Nigerian Naira |
| RTL | Right-to-Left text direction |
| API | Application Programming Interface |
| SEO | Search Engine Optimization |
| MVP | Minimum Viable Product |
| SaaS | Software as a Service |

---
## Current State

| Language | Status | Coverage |
|---|---|---|
| English (en) | ✅ Complete | 100% — all UI strings |
| Amharic (am) | ✅ Complete | 100% — all UI strings |
| Oromo (om) | ❌ Missing | 0% |
| Tigrinya (ti) | ❌ Missing | 0% |
| Somali (so) | ❌ Missing | 0% |
| Swahili (sw) | ❌ Missing | 0% |
| Arabic (ar) | ❌ Missing | 0% |
| French (fr) | ❌ Missing | 0% |

**Tech:** `react-i18next` + JSON locale files in `frontend-next/locales/`

---

## Phase 1: Ethiopia Complete (Now)

Add Oromo and Tigrinya — the 2nd and 3rd most-spoken languages in Ethiopia.

### How to add a new language

1. Copy `frontend-next/locales/en.json` to `frontend-next/locales/om.json`
2. Translate all values (keep keys in English)
3. Add `om` to the language switcher in `AppLayout.tsx`
4. Add `om` to the i18n configuration in `frontend-next/lib/i18n.ts`
5. Test RTL if adding Arabic (requires `dir="rtl"` on `<html>`)

### Oromo (om) — Priority
- ~35 million speakers in Ethiopia
- Latin script — straightforward to implement
- **Effort:** 2–3 weeks for professional translation

### Tigrinya (ti) — Priority
- ~7 million speakers in Ethiopia + Eritrea
- Ge'ez script (same as Amharic) — font already loaded
- **Effort:** 2–3 weeks for professional translation

---

## Phase 2: East Africa (6–12 months)

### Swahili (sw)
- Official language of Kenya, Tanzania, Uganda, DR Congo
- 200+ million speakers total (most widely spoken African language)
- **Market:** 500M+ potential users across East Africa
- **Payment integration needed:** M-Pesa (Kenya/Tanzania), MTN Mobile Money (Uganda)

### Somali (so)
- Horn of Africa coverage + large diaspora
- Arabic script variant — requires RTL support

---

## Phase 3: North Africa & Middle East (12–24 months)

### Arabic (ar)
- Right-to-left (RTL) layout required
- All flexbox/grid layouts need `dir="rtl"` CSS variants
- 400+ million Arabic speakers
- **Tailwind RTL:** Use `rtl:` variant prefix (Tailwind v3+)
- **Effort:** High — layout changes throughout the app

---

## Phase 4: Diaspora (Ongoing)

Ethiopian diaspora communities are in:
- **United States** (100K+ in DC/Virginia, Minnesota, Atlanta)
- **Europe** (Sweden, Germany, UK)
- **Middle East** (Saudi Arabia, UAE, Israel)

For diaspora users: English is sufficient, but currency display in USD/EUR is valuable.

---

## Currency Localisation

### Current
- All prices stored in **ETB** in the database
- Display is always ETB
- Stripe charges in USD (with ETB → USD conversion at ~0.008 rate)

### Planned
- Display prices in user's local currency (USD/EUR/GBP) as a reference
- Store exchange rates (update daily from NBE or open exchange rates API)
- **Implementation:** `NEXT_PUBLIC_DEFAULT_CURRENCY` env var per deployment region

```typescript
// Example currency display helper
function formatPrice(etbAmount: number, displayCurrency: 'ETB' | 'USD' | 'EUR') {
  if (displayCurrency === 'ETB') return `${etbAmount.toLocaleString()} ETB`;
  const rate = exchangeRates[displayCurrency]; // fetched daily
  return `${(etbAmount * rate).toFixed(2)} ${displayCurrency} (~${etbAmount.toLocaleString()} ETB)`;
}
```

---

## Date & Time Localisation

### Ethiopian Calendar
- Ethiopia uses the **Ge'ez calendar** (13 months, ~7–8 years behind Gregorian)
- Ethiopian New Year is September 11/12 (Enkutatash)
- For business-critical dates (order deadlines, event dates), display both calendars

```typescript
// Ethiopian calendar conversion (future feature)
import { toEthiopian } from 'ethiopian-calendar-date-converter';
const ethDate = toEthiopian(new Date()); // { year: 2016, month: 12, day: 5 }
```

### Time Zones
- Ethiopia: **UTC+3** (no daylight saving time — stable year-round)
- Store all timestamps in UTC in the database
- Display in user's local timezone (browser `Intl.DateTimeFormat`)

---

## Number Formatting

| Locale | Number format | Example |
|---|---|---|
| Ethiopia (en/am) | Ethiopian standard | 1,000,000.00 |
| Kenya (sw) | East African standard | 1,000,000.00 |
| Arabic | Arabic-Indic numerals | ١٬٠٠٠٬٠٠٠٫٠٠ |

Use `Intl.NumberFormat` — already built into browsers.

---

## Content Localisation (Beyond UI Strings)

### Seed Data
- Demo users should have Amharic/Ethiopian names
- Demo products should be Ethiopian goods (tej, injera, coffee, traditional clothing)
- Demo posts should reference Ethiopian places and culture

### Search
- The search API supports ILIKE matching — works with Amharic/UTF-8
- Future: full-text search with Amharic tokenizer

### Notifications
- Push notification text should be in the user's preferred language
- Store `preferred_language` on user profile
- Send notification with `t(key, { lng: user.preferred_language })`

---

## Expansion Readiness Checklist

Before entering a new market:

- [ ] Language translation complete and reviewed by native speaker
- [ ] Local payment method integrated (M-Pesa, MTN, etc.)
- [ ] Currency display configured
- [ ] Local legal entity or representative established
- [ ] Local content moderation team or partner
- [ ] Emergency contact for law enforcement requests
- [ ] GDPR/local data protection compliance reviewed
- [ ] App Store localisation (screenshots, description in local language)
