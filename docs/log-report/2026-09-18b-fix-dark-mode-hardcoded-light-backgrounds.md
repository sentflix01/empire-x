# fix: dark mode — remove hardcoded white/gray backgrounds

> **Type:** Bugfix · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## 1. What was this task?

Fixed dark mode rendering issues across the business profile page and showroom section renderer. In dark mode, several sections showed white or light gray backgrounds because they used hardcoded Tailwind color classes (`bg-white`, `bg-gray-50`, `bg-gray-900`, `from-gray-50 to-white`) instead of theme-aware CSS variable classes.

## 2. Why does it exist?

The showroom mini-website components were originally written for light mode only. When the user switches to dark mode via the Settings popup, these hardcoded colors no longer adapt — resulting in white boxes floating over the dark app background.

## 3. What was done?

- **3 files changed** (+5 / −7)

### `frontend-next/components/profile/BusinessProfile.tsx`

| Line | Before | After |
|---|---|---|
| Contact section | `bg-gradient-to-br from-gray-50 to-white` | `bg-secondary/30` |
| Footer | `bg-gray-900` + hardcoded `text-white/60` + hardcoded `© 2024` | `bg-muted` + `text-muted-foreground` + `© {new Date().getFullYear()}` |

### `frontend-next/components/showroom/SectionRenderer.tsx`

| Line | Before | After |
|---|---|---|
| Contact section wrapper | `bg-gradient-to-br from-gray-50 to-white` | `bg-secondary/30` |
| Hero CTA button (over cover) | `bg-white` | `bg-white/90 hover:bg-white` (semi-transparent — works on any theme) |
| CTA section button | `bg-white` | `bg-white/90 hover:bg-white` |

## 4. Verification

- TypeScript (source files): 0 errors
- Visual: "Get in Touch" section uses `bg-secondary/30` — adapts to dark mode ✓
- Visual: Footer uses `bg-muted` / `text-muted-foreground` — adapts to dark mode ✓
- Visual: CTA buttons over gradient covers use `bg-white/90` — readable on both themes ✓

---

*Log entry authored by Kiro — committed to branch `feat/personal-business-toggle-auth-port-fixes`.*
