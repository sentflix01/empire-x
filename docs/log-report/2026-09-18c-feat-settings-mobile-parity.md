# feat: settings mobile parity — full feature parity desktop/tablet/mobile

> **Type:** Feature · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## 1. What was this task?

Ensured full feature parity between desktop and mobile/tablet for the Settings popup. The Settings panel (Language, Theme, Data Mode) existed only on desktop sidebar. Mobile drawer had no settings access at all. Also fixed the collapsed desktop sidebar which suppressed the settings popup entirely.

## 2. Why does it exist?

On mobile, users had no way to change Language, Theme, or Data Mode — the only controls were in the desktop sidebar's Settings popup. The mobile drawer footer only showed Admin + Log out with no Settings button.

On the collapsed desktop sidebar, `settingsOpen && !sidebarCollapsed` prevented the popup from opening when the sidebar was in icon-only mode.

## 3. What was done?

- **1 file changed** — `frontend-next/components/layout/AppLayout.tsx`

### Mobile drawer — Settings section added

- Added `drawerSettingsOpen` boolean state (closes on route change alongside `drawerOpen`)
- Added **Settings accordion item** in the drawer's scrollable nav list, above the `h-4` spacer:
  - Clicking expands an inline panel with Language, Theme, Data Mode toggles — same functionality as the desktop popup but inline (no floating panel needed on mobile)
  - Animated chevron indicates open/closed state
  - Each row shows current value as a pill badge (same as desktop)
- Drawer footer simplified: Settings button removed (settings are inline in nav), Admin link kept for admin users, Log out always full-width

### Desktop sidebar collapsed mode — Settings popup fixed

- Removed `!sidebarCollapsed` guard from the popup condition — popup now opens in both expanded and collapsed states
- When collapsed: popup positioned `bottom: 0, left: '100%', marginLeft: 8px, width: 220px` — slides out to the right of the sidebar
- When expanded: popup positioned `bottom: '100%', left/right: 8px, marginBottom: 8px` — same as before (above footer)

## 4. Verification

- TypeScript: 0 errors
- Desktop expanded: Settings popup appears above footer ✓
- Desktop collapsed: Settings popup slides right of sidebar ✓
- Mobile drawer: Settings accordion item visible in nav list ✓
- Mobile drawer: Language/Theme/DataMode toggles work inline ✓
- Route change: both `drawerOpen` and `drawerSettingsOpen` reset to false ✓

---

*Log entry authored by Kiro — committed to branch `feat/personal-business-toggle-auth-port-fixes`.*
