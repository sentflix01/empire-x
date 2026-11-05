---
name: a11y-audit
description: Procedure for an accessibility audit of the Nodbusiness frontend against WCAG 2.2 Level AA and EN 301 549 V4.1.1, using axe-core and Playwright on the local stack plus scripted keyboard, zoom, reflow, contrast and reduced-motion checks. Use when auditing, fixing or reviewing accessibility of any page or component.
---

# Accessibility audit

Target: **WCAG 2.2 AA**. Report each failure against the exact success criterion
and the matching EN 301 549 V4.1.1 clause (9.x.x.x for web content). Record
results with the `audit-finding` skill.

## Setup

1. Start the stack (`local-stack` skill). Sign in with the seeded E2E accounts.
2. Use the preinstalled Chromium via Playwright (`require('playwright')`). Do not
   install other browsers in the cloud sandbox; Firefox/WebKit/real-device and
   screen-reader results are `UNVERIFIED` unless run elsewhere.
3. Use `@axe-core/playwright` from a scratch folder, pinned to an exact version,
   with tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`.

## Per page and per state

Run on every route from the Wave 1 inventory, and on each state: default, modal
or drawer open, menu expanded, form errors shown, empty state, loading state.

| Check | How | SC |
|---|---|---|
| Automated rules | axe scan; save JSON to `evidence/F-NNN/` | many |
| Keyboard | Tab through; record focus order, visible focus, traps, Esc closes, focus returns to trigger | 2.1.1, 2.1.2, 2.4.3, 2.4.7 |
| Focus not obscured | Sticky header/bottom bar never covers the focused element | 2.4.11 |
| Target size | Interactive targets ≥ 24×24 CSS px or spaced | 2.5.8 |
| Dragging | Every drag (e.g. builder sections) has a single-pointer alternative | 2.5.7 |
| Reflow and zoom | 320 px width and 400% zoom: no 2-D scrolling, nothing clipped | 1.4.10, 1.4.4 |
| Text spacing | Inject the 1.4.12 spacing stylesheet; nothing overlaps | 1.4.12 |
| Contrast | Text 4.5:1 (3:1 large); UI and focus 3:1; light and dark themes | 1.4.3, 1.4.11 |
| Forced colors | `forcedColors: 'active'` emulation; controls stay visible | 1.4.11 |
| Motion | `reducedMotion: 'reduce'`; no essential motion lost; nothing flashes > 3/s | 2.3.3, 2.3.1 |
| Forms | Labels, `autocomplete` purpose, error identification and suggestion, no repeated entry | 1.3.5, 3.3.1, 3.3.3, 3.3.7 |
| Authentication | Paste allowed in password/OTP; no cognitive test | 3.3.8 |
| Consistent help | Help/contact in the same place across pages | 3.2.6 |
| Language | `<html lang>` correct; Amharic content marked `lang="am"` | 3.1.1, 3.1.2 |
| Names and roles | Icon buttons named; landmarks and heading order sensible | 4.1.2, 1.3.1, 2.4.6 |
| Status messages | Toasts and async updates announced via live regions | 4.1.3 |

## Viewports and themes

375, 768 and 1440 px (plus 320 for reflow), light and dark, for every core
screen. Save screenshots at `deviceScaleFactor: 1` for checks you describe and 2
for screenshots a person will review.

## Known context

- `frontend-next/app/globals.css` is the only Tailwind config (DECISIONS.md, 2026-10-16).
- i18n via i18next, English and Amharic (`frontend-next/locales/`).
- Reported earlier: 44 px mobile touch targets, labelled icon buttons
  (`docs/PRODUCTION_READINESS_SCORECARD.md`) — verify, do not assume.
