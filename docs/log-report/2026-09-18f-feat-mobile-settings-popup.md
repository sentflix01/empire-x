# feat: mobile drawer — Settings popup above footer (matches desktop)

> **Type:** Feature · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## 1. What was this task?

Replaced the flat SETTINGS section in the mobile drawer's scrollable nav list with a floating popup panel — identical in design and behaviour to the desktop sidebar Settings popup. Clicking the Settings button in the drawer footer opens the popup above the footer; backdrop click closes it.

## 2. What was done?

- **1 file changed** — `frontend-next/components/layout/AppLayout.tsx`

### Mobile drawer (before → after)

**Before:** SETTINGS items (Language, Theme, Data Mode) were always-visible flat rows in the scrollable nav list — separate from the footer Settings button which only toggled `drawerSettingsOpen` (unused).

**After:**
- Flat SETTINGS section removed from nav list
- Footer Settings button now opens a floating popup (`drawerSettingsOpen`)
- Popup appears `bottom-full` above the footer, `left-3 right-3`, `z-50`
- Popup contains: Language, Theme, Data Mode (with pill badges), Account Settings, Analytics, Admin Panel (admin only)
- Backdrop click closes popup
- Settings button highlights when popup is open (`bg-secondary text-foreground`)
- Exactly matches desktop popup visual style

## 4. Verification

- TypeScript: 0 errors
- Mobile: Settings button in footer opens popup above footer ✓
- Mobile: Backdrop click closes popup ✓
- Mobile: All 6 settings items present ✓
- Matches desktop popup design ✓

---

*Log entry authored by Kiro.*
