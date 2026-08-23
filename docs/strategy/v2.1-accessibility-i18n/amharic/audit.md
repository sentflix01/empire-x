# Amharic Translation — Audit

## Current State

- i18next installed and configured ✅
- `frontend-next/locales/` directory exists ✅
- English translations: `locales/en/` ✅
- Amharic translations: unknown — likely empty or partial

## Translation Scope

Every user-facing string in the app needs an Amharic equivalent.
This is NOT just navigation labels — it's every button, error message, tooltip, placeholder, and empty state.

## High-Priority Strings (Phase 1)

These are the strings users see most often:

### Navigation
- Feed → ፊድ
- Marketplace → ገበያ
- Tasks → ተግባሮች
- Messages → መልዕክቶች
- Notifications → ማሳወቂያዎች
- Profile → መገለጫ
- Search → ፈልግ
- Nearby → አካባቢ

### Common Actions
- Post → ፍጠር
- Like → ወደድ
- Comment → አስተያየት
- Share → አጋራ
- Save → አስቀምጥ
- Follow → ተከተል
- Unfollow → አቁም
- Message → መልዕክት
- Buy Now → አሁን ግዛ
- Add to Cart → ወደ ቅርጫት ጨምር

### Common States
- Loading... → በመጫን ላይ...
- No results found → ምንም ውጤት አልተገኘም
- Something went wrong → ችግር ተፈጥሯል
- Try again → እንደገና ሞክር

## Translation File Structure
```
frontend-next/locales/
  en/
    common.json      ← buttons, labels, states
    feed.json        ← feed-specific strings
    marketplace.json ← marketplace strings
    auth.tson        ← login/register strings
    ...
  am/
    common.json      ← Amharic equivalents
    feed.json
    marketplace.json
    auth.tson
    ...
```

## Issues to Investigate
- [ ] Are translation files organized by feature or all in one file?
- [ ] Is the language detection working (browser → user preference → default)?
- [ ] Are there any hardcoded English strings in components (not using `t()`)?
- [ ] Is there a language preference saved to user profile?
