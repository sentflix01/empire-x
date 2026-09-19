# feat: mobile drawer — full desktop parity, Settings beside Log out in footer

> **Type:** Feature · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## 1. What was this task?

Rewrote the mobile drawer nav list to exactly match the desktop sidebar layout. Compared screenshots confirmed the mobile drawer was missing collapsible chevron toggles on DISCOVER and MY ACCOUNT, had a duplicate/pinned Account Settings link, and had Log out without Settings in the footer.

## 2. What was done?

- **1 file changed** — `frontend-next/components/layout/AppLayout.tsx`

### Mobile drawer structure (after — matches desktop exactly)

```
[Cover photo + Avatar + Name/Email]
[Account Settings — pinned shortcut]
─── scrollable list ───
  Home, Explore, Friends, Businesses, Marketplace, Tasks, Mewacho, Messages, Profile
  (Personal|Business pills under Home/Profile when active)
  ─ divider ─
  [+ Create Showroom]  [Showroom Studio]
  ─ DISCOVER ▼ (collapsible toggle) ─
    Showrooms, Events, Jobs, Courses
  ─ MY ACCOUNT ▼ (collapsible toggle) ─
    Orders, Cart, Wallet, Referral, My Coupons, Analytics, Account Settings, Privacy
  ─ Admin Panel (admin only) ─
  ─ SETTINGS ─
    Language / Theme / Data Mode (with pill badges)
─── footer ───
  [⚙ Settings]  [→ Log out]   ← side by side
```

### Key fixes vs previous mobile drawer

| Area | Before | After |
|---|---|---|
| DISCOVER section | Flat always-visible | Collapsible with chevron toggle (shared state with desktop `discoverOpen`) |
| MY ACCOUNT section | Flat always-visible, filtered out `/account` | Collapsible with chevron toggle; shows ALL items including Account Settings |
| Admin Panel | Only in footer | Dedicated section above SETTINGS |
| SETTINGS section | Last item in scrollable list (correct) | Same — Language, Theme, Data Mode only (Account Settings + Analytics already in MY ACCOUNT) |
| Footer | Log out only | `[Settings] [Log out]` side by side |

## 4. Verification

- TypeScript: 0 errors
- Mobile drawer structure matches desktop screenshots ✓
- DISCOVER and MY ACCOUNT collapsible with shared open/close state ✓
- Footer: Settings + Log out side by side ✓

---

*Log entry authored by Kiro — committed to branch `feat/personal-business-toggle-auth-port-fixes`.*
