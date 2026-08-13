# Typography & Spacing — Audit

## Why This Matters

Inconsistent spacing and typography are the most visible signs that an app was built without a design system. Global-standard apps have a clear visual rhythm — every heading, body text, and spacing unit follows a predictable scale.

## Current Design Tokens (from globals.css + Tailwind)

### Colors (already defined)
- Primary: `#2563eb` (blue)
- Accent: `#7c3aed` (purple)
- Gold: `#f59e0b`
- Surfaces: CSS variables via `hsl(var(--background))` etc.

### Typography Scale (Tailwind defaults)
| Class | Size | Use |
|-------|------|-----|
| `text-xs` | 12px | Fine print only — never for readable content |
| `text-sm` | 14px | Secondary text, labels, captions |
| `text-base` | 16px | Body text, input fields |
| `text-lg` | 18px | Section headings, card titles |
| `text-xl` | 20px | Page subheadings |
| `text-2xl` | 24px | Page headings |
| `text-3xl` | 30px | Hero headings |

### Spacing Scale (Tailwind)
- `gap-1` = 4px — icon + text
- `gap-2` = 8px — tight groups
- `gap-3` = 12px — list items
- `gap-4` = 16px — standard component padding
- `gap-6` = 24px — between sections
- `gap-8` = 32px — between major sections
- `p-4` = 16px — standard card padding
- `p-6` = 24px — comfortable card padding

---

## Common Issues to Audit

- [ ] Inputs using `text-sm` instead of `text-base` (causes iOS zoom)
- [ ] Inconsistent heading sizes across pages
- [ ] Inconsistent card padding (some `p-3`, some `p-4`, some `p-6`)
- [ ] Line height too tight on body text (should be `leading-relaxed`)
- [ ] No visual hierarchy — all text same weight/size
- [ ] Truncated text without `title` attribute tooltip
