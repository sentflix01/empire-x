# Nodbusiness — Localization & Internationalization Strategy

> How Nodbusiness supports multiple languages, currencies, and regional contexts.
> i18n (internationalization) is built into the platform from day one — not retrofitted later.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| i18n | Internationalization — designing software to support multiple languages/regions |
| l10n | Localization — adapting content for a specific locale |
| RTL | Right-to-Left — text direction for Arabic, Hebrew, Persian |
| LTR | Left-to-Right — standard text direction for English, Amharic |
| ISO | International Organization for Standardization |
| UTC | Coordinated Universal Time |
| API | Application Programming Interface |
| UI | User Interface |
| UX | User Experience |

---

## 1. Supported Languages (Current + Planned)

| Language | Code | Status | Priority | Notes |
|---------|------|--------|---------|-------|
| English | `en` | ✅ Live | P0 — Primary | Global default |
| Amharic | `am` | 🔄 In progress | P1 — High | Ethiopia reference market |
| Swahili | `sw` | 📅 Planned | P2 | Kenya + Tanzania expansion |
| Arabic | `ar` | 📅 Planned | P2 | Gulf + North Africa |
| French | `fr` | 📅 Planned | P3 | Francophone Africa |
| Hindi | `hi` | 📅 Planned | P3 | India expansion |
| Portuguese | `pt` | 📅 Planned | P3 | Brazil, Mozambique, Angola |
| Hausa | `ha` | 📅 Planned | P3 | Nigeria, Niger, Cameroon |

---

## 2. Currency Support

Nodbusiness displays prices in the user's preferred currency where possible.

| Currency | Code | Status | Region |
|---------|------|--------|--------|
| US Dollar | USD | ✅ Live | Global default |
| Ethiopian Birr | ETB | ✅ Live | Reference market |
| Kenyan Shilling | KES | 📅 Planned | Kenya |
| Nigerian Naira | NGN | 📅 Planned | Nigeria |
| Ghanaian Cedi | GHS | 📅 Planned | Ghana |
| British Pound | GBP | 📅 Planned | UK diaspora |
| Euro | EUR | 📅 Planned | EU diaspora |
| UAE Dirham | AED | 📅 Planned | Gulf market |
| Indian Rupee | INR | 📅 Planned | India expansion |

**Implementation:**
- Exchange rates fetched from a public API daily and cached in Redis
- **Prices are stored and settled in ETB only** (the ledger currency — see
  `architecture/CURRENCY_AND_COMMISSION.md`); multi-currency display is a planned layer that
  never changes stored amounts
- Display currency converted on the frontend per user preference once that layer ships
- Sellers set prices in ETB today

---

## 3. Translation Workflow

### File Structure
All translation strings live in `frontend-next/locales/`:
```
locales/
  en/
    common.json        ← buttons, navigation, general UI
    auth.tson          ← login, register, OTP screens
    marketplace.json   ← product listing, cart, orders
    showroom.json      ← showroom builder, templates
    feed.json          ← post, comment, story
    wallet.tson        ← balance, topup, withdraw
    errors.json        ← all error messages
  am/
    common.json        ← Amharic translations
    ...
```

### Adding a New Translation

1. Add English string to the appropriate `en/*.json` file
2. Add translation key to all active locale files
3. Use the `t()` function from `i18next` in the component:
   ```typescript
   const { t } = useTranslation('marketplace');
   <p>{t('product.add_to_cart')}</p>
   ```
4. If Amharic or other locale string is not yet translated, it falls back to English automatically

### Translation Process
```
Developer adds English string with key
    ↓
Translation key added to en/*.json
    ↓
Other locale files marked with NEEDS_TRANSLATION comment
    ↓
Translator fills in the translation
    ↓
PR reviewed for translation accuracy
    ↓
Merged and deployed
```

---

## 4. Date, Time, and Number Formatting

```typescript
// Use Intl.DateTimeFormat for locale-aware date formatting
const date = new Intl.DateTimeFormat(userLocale, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date(order.created_at));

// Use Intl.NumberFormat for currency
const price = new Intl.NumberFormat(userLocale, {
  style: 'currency',
  currency: userCurrency,
}).format(product.price_usd * exchangeRate);
```

**Key rules:**
- All dates stored in UTC in the database
- All dates displayed in the user's local timezone
- All prices stored in USD (base currency) in the database
- Prices displayed in the user's preferred currency, converted on the fly

---

## 5. RTL Support

For Arabic (and future Hebrew/Persian support):

```typescript
// In app/layout.tsx, set dir attribute based on locale
<html lang={locale} dir={isRTL(locale) ? 'rtl' : 'ltr'}>

// In Tailwind, use logical properties
// Instead of: ml-4, mr-4, pl-4, pr-4
// Use: ms-4, me-4, ps-4, pe-4 (margin/padding start/end)
```

RTL languages require:
- Mirrored layout (sidebar on right, icons flipped)
- Correct text alignment
- RTL-aware icon selection
- Testing with actual RTL content (not just `dir="rtl"`)

---

## 6. Ethiopian Context (Reference Market Detail)

Amharic support specifics:
- **Character set:** Ethiopic script (Ge'ez), unique Unicode block U+1200–U+137F
- **Font:** Noto Serif Ethiopic or similar (ensure it's loaded for Amharic users)
- **Text direction:** Left-to-right (same as English)
- **Number system:** Users are familiar with Western Arabic numerals (0–9)
- **Date format:** Ethiopian calendar (EC) uses different epoch; display both EC and Gregorian where possible
- **Phone format:** +251 country code; 9-digit numbers after country code

---

## 7. Testing Localization

```bash
# Test Amharic locale locally
NEXT_PUBLIC_DEFAULT_LOCALE=am npm run dev

# Check for missing translation keys
npm run i18n:check  # (script to add to package.json)
```

**Manual testing checklist:**
- [ ] All UI text visible in Amharic without overflow or clipping
- [ ] Date and time display correctly in user's timezone
- [ ] Currency converts and displays with correct symbol
- [ ] Long Amharic strings don't break layout on mobile (375px)
- [ ] Error messages are translated (most often missed)

---

*Owner: Engineering + Product*
*Translation management: Add Crowdin or Lokalise for community translation contributions (Phase 2)*
