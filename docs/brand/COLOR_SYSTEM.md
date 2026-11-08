# Colour system

**Owner:** Project owner · **Decided:** 2026-11-07 (audit F-046) · **Source of truth for colour**

This page replaces the colour sections of `BRAND_BOOK.md` and `BRAND_GUIDELINES.md`,
which contradicted each other (blue vs amber as the primary colour).

## The model

Nodbusiness follows the model used by Facebook and LinkedIn: **one brand colour,
neutral surfaces, separate status colours, no decorative accent.**

| Role | Token (Tailwind class) | Light | Dark | Used for |
|---|---|---|---|---|
| **Primary** (major) | `primary` | `#2563eb` | `#2563eb` fill · `#93b4fb` text | The main action on a screen, links, selected state, personal identity |
| Primary tint | `primary-subtle` | `#eff6ff` | blue at 16% | Highlighted or selected areas: active tab, unread row, info notice |
| **Secondary** | `brand-secondary` | `#7c3aed` | `#7c3aed` fill · `#c4b5fd` text | Business identity (profile toggle, map markers, business badges), AI assistant |
| Success | `success` | `#157a3a` | `#4ade80` text | Paid, delivered, verified, online |
| Warning | `warning` | `#b45309` | `#fbbf24` text | Pending, expiring, needs attention |
| Error | `destructive` | `#c81e1e` | `#f87171` text | Errors, delete, cancelled, unread counts |
| Rating | `rating` | `#d97706` | `#fbbf24` | Star ratings only |
| Neutrals | `background`, `card`, `secondary`, `muted-foreground`, `border`, `foreground` | slate greys | slate greys | Most of every screen |
| Inverse | `inverse` | `#0f172a` | card | Dark panels with white text |

Every status colour has `-subtle` (tint background) and `-subtle-foreground`
(text on that tint).

## Rules

1. **Most of the screen is neutral.** Colour marks what matters.
2. **One primary action per screen** uses `bg-primary`. Other actions are outline or ghost buttons.
3. **Status colours never decorate.** Green means success, amber means warning, red means error or an unread count.
4. **Solid fills, no gradients** in the app. (The landing-page hero is the one marketing exception.)
5. **Text on a coloured fill is solid white** (`text-white` / `-foreground`), never translucent white.
6. **Colour is never the only signal** (WCAG 1.4.1): pair it with a label, icon or shape.
7. **Contrast:** text ≥ 4.5:1, icons and control borders ≥ 3:1 (WCAG 1.4.3, 1.4.11). Every token pair above was measured.

## In code

- Classes: `bg-primary`, `text-success`, `bg-warning-subtle text-warning-subtle-foreground`, `border-destructive/30`…
- Inline styles on DOM elements: `token.*` from `frontend-next/lib/colorTokens.ts` (follows dark mode).
- Maps, charts, canvas, share image: `HEX.*` and `CHART_SERIES` from the same module.
  `test/colorTokens.test.ts` keeps them equal to `app/globals.css`.
- `npm run check:colors` (part of `npm run lint`, so CI) fails on raw palette classes
  (`bg-amber-500`), arbitrary colour classes (`bg-[#f59e0b]`) and hex literals outside
  the documented exemptions (business-chosen theme colours, Google/Telegram/WhatsApp brand
  colours, pages rendered without app CSS).

## Not covered by the tokens

- **Business colours:** each business picks its own theme colour for its showroom and profile. Those stay the business's choice.
- **Other brands:** Google sign-in, Telegram and WhatsApp buttons keep their required colours.
- **The logo** is black and white.

## How it was applied (2026-11-07)

`frontend-next/scripts/codemods/color-tokens.mjs` replaced 1,803 raw palette classes by meaning
and dropped 218 `dark:` duplicates the tokens make unnecessary; app-interface hex colours were
moved to `lib/colorTokens.ts` by hand. Accessibility scan (axe-core 4.10.3, 30 page states, light
and dark): no violations.
