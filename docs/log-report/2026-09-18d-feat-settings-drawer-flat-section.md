# feat: settings mobile drawer — flat section matching desktop sidebar style

> **Type:** Feature · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## 1. What was this task?

Replaced the collapsible accordion Settings section in the mobile drawer with a flat always-visible "SETTINGS" labelled section — identical in structure to the DISCOVER and MY ACCOUNT sections. Now fully matches the desktop sidebar screenshot.

## 2. Why does it exist?

The previous mobile drawer Settings was an accordion (click to expand) — inconsistent with the desktop sidebar where Settings items are always visible as a flat labelled group. The user confirmed the desktop layout (screenshot 2) is the reference design and the mobile drawer should match it exactly.

## 3. What was done?

- **1 file changed** — `frontend-next/components/layout/AppLayout.tsx`

### Mobile drawer Settings section (before → after)

**Before:** Collapsible accordion button → expands a bordered panel with Language, Theme, Data Mode only.

**After:** Flat section with `SETTINGS` label (same style as `DISCOVER`, `MY ACCOUNT`):
- Language (with EN/አማ pill)
- Theme (with Light/Dark pill, correct sun/moon icon)
- Data Mode (with Real/Demo pill)
- Account Settings (link → /account)
- Analytics (link → /analytics)
- Admin Panel (link → /admin, admin role only)

### Drawer footer simplified

Removed redundant Admin link from footer (now in Settings section). Footer contains Log out only, full-width.

### State cleanup

`drawerSettingsOpen` state and related reset in `useEffect` are still present but unused — can be removed in a future cleanup pass.

## 4. Verification

- TypeScript: 0 errors
- Mobile drawer: SETTINGS section always visible with all 6 items ✓
- Matches desktop sidebar structure exactly ✓

---

*Log entry authored by Kiro — committed to branch `feat/personal-business-toggle-auth-port-fixes`.*
