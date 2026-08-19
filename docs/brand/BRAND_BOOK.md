# Halehame — Brand Book

> **The definitive guide to how Halehame looks, sounds, and feels.**
> Every designer, developer, marketer, and partner follows this guide.
> Consistency builds trust. Trust builds brands.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| UI | User Interface |
| UX | User Experience |
| RGB | Red Green Blue — color model for screens |
| HEX | Hexadecimal — color code format (e.g., #2563eb) |
| SVG | Scalable Vector Graphics — vector image format |
| PNG | Portable Network Graphics — raster image format |
| PDF | Portable Document Format |
| CSS | Cascading Style Sheets |

---

## 1. Brand Identity

### Name
**Halehame** — one word, no spaces, no hyphens.

```
✅ Halehame
✅ HALEHAME (in all-caps contexts only)
❌ HaleHame
❌ Hale-hame
❌ hale hame
```

### Tagline
**"The Global Superapp"**

Alternative taglines by context:
- Marketplace: "Your business, everywhere"
- Developers: "Build on Halehame"
- Community: "Connect. Trade. Grow."

### Mission Statement
Halehame exists to give every business in the world a professional presence,
a way to reach customers, and a community to grow with — regardless of their
size, location, or technical ability.

### Brand Personality
```
Ambitious      — We think big. Global from day one.
Warm           — We care about the people behind every business.
Direct         — We say what we mean, simply and clearly.
Trustworthy    — We are reliable, honest, and consistent.
Enabling       — We give people tools, not limitations.
```

---

## 2. Logo System

### Primary Logo
- Crown icon (👑) + wordmark "Halehame"
- Crown represents: excellence, achievement, ambition
- File: `frontend-next/public/brand/halehame-logo.svg`

### Logo Variations
```
Primary:     Crown + wordmark (horizontal) — use for most contexts
Stacked:     Crown above wordmark — use for square formats
Icon only:   Crown alone — use for favicon, app icon, small spaces
Wordmark:    Text only — use when crown would be too small to render
```

### Logo Clear Space
Minimum clear space around logo = height of the crown icon on all sides.
Never place text, icons, or images inside the clear space.

### Logo Don'ts
```
❌ Rotate the logo
❌ Stretch or distort the logo
❌ Change the logo colors
❌ Add drop shadows or effects
❌ Place on busy photographic backgrounds without a solid overlay
❌ Use the logo smaller than 24px height (use icon only below this)
```

### File Formats to Always Have Available
```
halehame-logo.svg          ← Primary (scalable, use everywhere possible)
halehame-logo.png          ← For contexts that don't support SVG
halehame-logo-white.svg    ← For dark backgrounds
halehame-logo-black.svg    ← For light/neutral backgrounds
halehame-icon.svg          ← Crown only (favicon, app icon)
halehame-icon-192.png      ← PWA icon
halehame-icon-512.png      ← PWA icon large
```

---

## 3. Color System

### Primary Palette

| Color | Name | HEX | RGB | Usage |
|-------|------|-----|-----|-------|
| ![#2563eb](https://via.placeholder.com/15/2563eb/000000?text=+) | Halehame Blue | `#2563eb` | 37, 99, 235 | Primary actions, links, buttons, active states |
| ![#7c3aed](https://via.placeholder.com/15/7c3aed/000000?text=+) | Halehame Purple | `#7c3aed` | 124, 58, 237 | Accent, gradients, secondary brand |
| ![#D4AF37](https://via.placeholder.com/15/D4AF37/000000?text=+) | Halehame Gold | `#D4AF37` | 212, 175, 55 | Premium, verified badges, highlights |
| ![#111111](https://via.placeholder.com/15/111111/000000?text=+) | Black | `#111111` | 17, 17, 17 | Primary text, headings |
| ![#ffffff](https://via.placeholder.com/15/ffffff/000000?text=+) | White | `#ffffff` | 255, 255, 255 | Backgrounds, reversed text |

### Brand Gradient
```css
background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
```
Use for: CTAs, hero sections, feature highlights, app store badges.

### Secondary Palette (UI)

| Color | Name | HEX | Usage |
|-------|------|-----|-------|
| `#10b981` | Success Green | — | Positive states, verified, approved |
| `#f59e0b` | Warning Amber | — | Alerts, pending, attention |
| `#ef4444` | Error Red | — | Errors, banned, rejected, danger |
| `#6b7280` | Neutral Gray | — | Secondary text, borders, placeholders |

### Dark Mode Palette
```css
--background:  hsl(222, 47%, 9%);     /* #0f172a equivalent */
--card:        hsl(222, 39%, 13%);
--foreground:  hsl(210, 20%, 95%);
--primary:     hsl(217, 91%, 60%);    /* Slightly lighter blue for dark bg */
--accent:      hsl(263, 90%, 66%);    /* Slightly lighter purple */
```

---

## 4. Typography

### Type Scale

| Level | Use | Font | Size | Weight |
|-------|-----|------|------|--------|
| Display | Hero headings | Inter / System | 48–72px | 800 Black |
| H1 | Page titles | Inter / System | 32–40px | 700 Bold |
| H2 | Section headings | Inter / System | 24–28px | 600 SemiBold |
| H3 | Card titles | Inter / System | 18–20px | 600 SemiBold |
| Body | Default text | Inter / System | 14–16px | 400 Regular |
| Caption | Labels, metadata | Inter / System | 12px | 400 Regular |
| Mono | Code, IDs | Fira Code / Mono | 13px | 400 Regular |

### Font Stack
```css
font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
font-family-mono: 'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace;
```

### Typography Rules
```
✅ Minimum body font size: 14px
✅ Minimum input font size: 16px (prevents iOS zoom on focus)
✅ Line height for body: 1.5–1.625 (leading-relaxed in Tailwind)
✅ Maximum line length: 65–75 characters (optimal reading width)
❌ Never use more than 2 typefaces in one layout
❌ Never set body text below 14px
❌ Never use pure black (#000) — use #111111 or #0f172a
```

---

## 5. Iconography

### Icon Library
**Lucide React** — the only icon library used across all Halehame products.

```
Why Lucide:
  → Consistent stroke weight (2px)
  → Clean, minimal, internationally recognizable
  → Open source (MIT license)
  → Available in all formats (React, SVG, PNG)
  → Already installed in frontend-next
```

### Icon Sizes
| Context | Size | Tailwind Class |
|---------|------|----------------|
| Inline with text | 16px | `w-4 h-4` |
| UI elements (buttons, inputs) | 20px | `w-5 h-5` |
| Navigation, tabs | 24px | `w-6 h-6` |
| Feature icons | 32px | `w-8 h-8` |
| Hero/empty state icons | 48px | `w-12 h-12` |

### Custom Icons
For brand-specific icons (crown, halehame logo mark), use the SVG files
in `frontend-next/public/brand/`.

---

## 6. Spacing & Layout

### Spacing Scale (Tailwind)
```
4px   (gap-1)  — Between icon and label
8px   (gap-2)  — Tight element groups
12px  (gap-3)  — Related list items
16px  (gap-4)  — Standard component padding
24px  (gap-6)  — Between sections
32px  (gap-8)  — Between major sections
48px  (gap-12) — Page sections
64px  (gap-16) — Hero spacing
```

### Border Radius
```
2px   (rounded-sm)   — Small tags, chips
6px   (rounded-md)   — Inputs, buttons
8px   (rounded-lg)   — Small cards
12px  (rounded-xl)   — Standard cards
16px  (rounded-2xl)  — Large cards, modals
9999px (rounded-full) — Pills, avatars, badges
```

### Elevation (Shadows)
```
shadow-sm   — Cards in a flat context
shadow-md   — Elevated cards, dropdowns
shadow-lg   — Modals, sheets
shadow-xl   — Hero elements, feature spotlights
```

---

## 7. Photography & Imagery Style

### Do Use
```
✅ Real people — not stock-photo-perfect models
✅ Diverse representations — all ethnicities, ages, body types
✅ Business contexts — people working, creating, building
✅ Local authenticity — authentic settings relevant to the user's world
✅ Warm, natural lighting
✅ Candid, unposed moments (especially for community/social contexts)
```

### Do Not Use
```
❌ Generic stock photography with obvious staged setups
❌ Images that represent only one culture or geography
❌ Overly polished, unrealistic lifestyle imagery
❌ Images with visible competitor logos or products
❌ Low-resolution images (minimum 72dpi screen, 300dpi print)
```

### Image Overlay for Text Legibility
When text appears over photos, use:
```css
background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 100%);
```

---

## 8. Motion & Animation

### Principles
```
Purposeful — Animation should guide attention, not distract
Swift      — Transitions: 150–300ms (never over 500ms for UI)
Natural    — Use ease-in-out curves, not linear
Respectful — Respect prefers-reduced-motion accessibility setting
```

### Standard Transitions
```css
/* Button hover */
transition: all 150ms ease-in-out;

/* Modal / sheet entrance */
transition: transform 250ms ease-out, opacity 250ms ease-out;

/* Content fade-in */
transition: opacity 300ms ease-in;
```

### Animation Library
**Framer Motion** (already installed) — use for:
- Page transitions
- Modal/sheet open/close
- Like/heart animations (scale pulse)
- Skeleton to content transitions

---

## 9. Accessibility in Brand

All brand materials must meet **WCAG 2.1 AA** minimum:
```
Text contrast ratio:       4.5:1 minimum (body text)
Large text contrast ratio: 3:1 minimum (headings 18px+)
Focus indicators:          Visible on all interactive elements
Alt text:                  Required on all brand images
```

### Color Contrast Check
```
Blue (#2563eb) on White (#fff):   5.9:1 ✅ AA
Gold (#D4AF37) on White (#fff):   2.8:1 ❌ (use only for decorative, not text)
Gold (#D4AF37) on Black (#111):   7.4:1 ✅ AAA
White (#fff) on Blue (#2563eb):   5.9:1 ✅ AA
```

---

## 10. Brand in Code

### CSS Custom Properties (from globals.css)
```css
--ex-blue:   #2563eb;   /* Primary blue */
--ex-purple: #7c3aed;   /* Accent purple */
--ex-gold:   #D4AF37;   /* Gold highlight */
```

### Tailwind Usage
```tsx
// ✅ Use brand tokens
className="bg-primary text-primary-foreground"
className="text-amber-500"  /* gold context */

// ❌ Never hardcode brand colors
style={{ color: '#2563eb' }}
```

---

*This Brand Book is a living document. Update it when the brand evolves.*
*Every team member is responsible for upholding brand standards.*
