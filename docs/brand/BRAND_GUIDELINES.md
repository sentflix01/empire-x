# Nodbusiness — Brand Guidelines

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** 2026-11-09

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| RGB | Red Green Blue (color model) |
| HEX | Hexadecimal color code |
| CMYK | Cyan Magenta Yellow Key (print color model) |
| SVG | Scalable Vector Graphics |
| PNG | Portable Network Graphics |
| UI | User Interface |
| UX | User Experience |

---

## 1. Brand Essence

### 1.1 Mission
> **Empower every African business to own their digital presence, connect with customers, and grow — on their terms.**

### 1.2 Vision
> **The default operating system for African small business.**

### 1.3 Core Values

| Value | Behavior |
|-------|----------|
| **Ownership** | Business owns their data, customers, brand — not the platform |
| **Accessibility** | Works on any device, any network, any language (Amharic + English + RTL) |
| **Trust** | Transparent pricing, data ownership, local payments, no lock-in |
| **Community** | Social by default — discovery, chat, referrals, reviews built-in |
| **Excellence** | Quality-adjusted economics reward the best builders and businesses |

### 1.4 Brand Personality

| Trait | Expression |
|-------|------------|
| **Empowering** | "You built this. You own this." |
| **Approachable** | No jargon. Clear, human language. |
| **Confident** | Proven technology, patents, security. |
| **Local** | Built in Africa, for Africa. Amharic-first. |
| **Ambitious** | Global standards, African scale. |

---

## 2. Visual Identity

### 2.1 Logo

| Variant | Usage | File (`frontend-next/public/brand/`) |
|---------|-------|------|
| **Icon** | App icon, avatar, light or dark backgrounds | `nodbusiness-icon-v3.svg` (vector: network over the globe, white on blue) |
| **Icon on blue** | Any blue background (buttons, blue cards, share image) | `nodbusiness-icon-on-blue-v3.svg` (white ring around the disc) |
| **Small icon** | 24 px and below, favicon | `nodbusiness-icon-small-v3.svg` (bolder lines; `-on-blue-small` on blue) |
| **Wordmark** | Marketing files | `nodbusiness-logo-v3.svg` / `nodbusiness-logo-white-v3.svg` (the icon is the "o") |
| **Animated** | Landing hero, sign-in | `nodbusiness-intro-288-v2.mp4`, plays once and ends on the vector icon |

In the app, use `BrandLogo` (pass `size` for logos above 24 px, and `variant="onBlue"` on blue) and `Wordmark` (the name with the icon as the "o", in the heavy sans). Never put the plain icon on blue; a unit test checks this. Code uses files only through `frontend-next/lib/brandAssets.ts`. A changed logo file gets a new name (bump `-vN`), so no browser keeps the old copy; old names redirect.

**Clear Space:** Minimum `1x` icon height on all sides  
**Minimum Size:** 24px height (digital), 15mm (print)  
**Background:** The icon carries its own blue background; use the wordmark on light backgrounds and the white wordmark on dark ones. Colours: `COLOR_SYSTEM.md`.

### 2.2 Color Palette

> **Colour is defined in [`COLOR_SYSTEM.md`](COLOR_SYSTEM.md)** (decided 2026-11-07, audit F-046).
> This section used to disagree with the other brand document (blue vs amber as primary).

| Role | Colour | Use |
|---|---|---|
| Primary | Blue `#2563eb` | Main action, links, selected state, personal identity |
| Secondary | Violet `#7c3aed` | Business identity, AI assistant |
| Status | Success `#157a3a` · Warning `#b45309` · Error `#c81e1e` | States only, never decoration |
| Neutrals | Slate greys | Most of every screen |

No decorative accent colour and no gradients in the app; gold is no longer a brand colour.

### 2.3 Gradients

None in the app: solid fills only (`COLOR_SYSTEM.md`, rule 4).

---

## 2.4 Typography

### Font Stack

| Role | Font | Fallback | Weights |
|------|------|----------|---------|
| **Display** | `Plus Jakarta Sans` | `Inter`, `system-ui` | 400, 500, 600, 700, 800 |
| **Body** | `Inter` | `system-ui`, `sans-serif` | 400, 500, 600 |
| **Mono** | `JetBrains Mono` | `Fira Code`, `monospace` | 400, 500 |

**Web Font Loading:** `font-display: swap`, preload critical weights

### Scale (Rem-Based)

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| **display-xl** | 3.75rem (60px) | 1.1 | Hero headlines |
| **display-lg** | 3rem (48px) | 1.15 | Page titles |
| **display-md** | 2.25rem (36px) | 1.2 | Section headers |
| **display-sm** | 1.875rem (30px) | 1.25 | Card titles |
| **heading-lg** | 1.5rem (24px) | 1.3 | Section headings |
| **heading-md** | 1.25rem (20px) | 1.4 | Subsections |
| **heading-sm** | 1.125rem (18px) | 1.4 | Card headings |
| **body-lg** | 1.125rem (18px) | 1.6 | Lead paragraphs |
| **body-md** | 1rem (16px) | 1.6 | Body text |
| **body-sm** | 0.875rem (14px) | 1.5 | Captions, meta |
| **body-xs** | 0.75rem (12px) | 1.5 | Legal, timestamps |
| **mono-md** | 1rem (16px) | 1.5 | Code, amounts |
| **mono-sm** | 0.875rem (14px) | 1.5 | Inline code |

---

## 2.5 Iconography

| Style | Specification |
|-------|---------------|
| **Set** | `lucide-react` (primary), custom for brand-specific |
| **Stroke** | 2px (24x24), 1.5px (20x20), 1px (16x16) |
| **Corner Radius** | 2px (24x24) |
| **Fill** | None (outline only) — except brand mark |
| **Color** | `currentColor` (inherits text color) |

**Custom Icons:** `NodbusinessMark`, `AmberPulse`, `ShieldCheck`, `WalletCoin`, `ShowroomGrid`

---

## 2.6 Spacing & Layout

### Spacing Scale (4px Base)

| Token | Value | Usage |
|-------|-------|-------|
| **space-0** | 0 | Reset |
| **space-1** | 0.25rem (4px) | Tight |
| **space-2** | 0.5rem (8px) | Base unit |
| **space-3** | 0.75rem (12px) | Comfortable |
| **space-4** | 1rem (16px) | Standard |
| **space-5** | 1.25rem (20px) | Generous |
| **space-6** | 1.5rem (24px) | Section |
| **space-8** | 2rem (32px) | Large section |
| **space-10** | 2.5rem (40px) | Page sections |
| **space-12** | 3rem (48px) | Hero |
| **space-16** | 4rem (64px) | Landing |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| **radius-none** | 0 | Sharp |
| **radius-sm** | 0.25rem (4px) | Inputs, badges |
| **radius-md** | 0.375rem (6px) | Buttons, cards |
| **radius-lg** | 0.5rem (8px) | Modals, dropdowns |
| **radius-xl** | 0.75rem (12px) | Large cards |
| **radius-2xl** | 1rem (16px) | Hero cards |
| **radius-full** | 9999px | Pills, avatars |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| **shadow-sm** | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Cards, inputs |
| **shadow-md** | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Cards, dropdowns |
| **shadow-lg** | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | Modals, sheets |
| **shadow-xl** | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | Sheets, drawers |
| **shadow-glow** | `0 0 20px rgb(245 158 11 / 0.3)` | Primary buttons hover |

---

## 2.7 Motion

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| **motion-instant** | 0ms | — | Immediate |
| **motion-fast** | 150ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover, focus |
| **motion-normal** | 250ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Transitions, modals |
| **motion-slow** | 350ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Sheets, drawers |
| **motion-bounce** | 400ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Success, celebrations |

**Reduced Motion:** Respect `prefers-reduced-motion` — disable non-essential animation

---

## 3. Voice & Tone

### 3.1 Voice Principles

| Principle | Do | Don't |
|-----------|----|-------|
| **Clear** | "Publish your showroom in 10 minutes" | "Leverage our rapid deployment paradigm" |
| **Human** | "Welcome back, Alem!" | "User session initiated" |
| **Empowering** | "You own your customers" | "We give you access to customers" |
| **Local** | "እንኳን ደህና መጡ" (Welcome in Amharic) | "Welcome to our platform" |
| **Confident** | "Your data. Your customers. Your brand." | "We keep your data safe" |

### 3.2 Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| **Onboarding** | Encouraging, step-by-step | "Great start! Let's add your first product." |
| **Error** | Helpful, not blaming | "Something went wrong. Here's how to fix it." |
| **Success** | Celebratory, specific | "🎉 Your showroom is live! 47 views in the first hour." |
| **Support** | Empathetic, actionable | "I understand this is frustrating. Let me fix it." |
| **Marketing** | Inspiring, proof-led | "Join 5,000+ Ethiopian businesses selling online." |
| **Legal/Compliance** | Clear, precise, accessible | "We process your data per our Privacy Policy." |

### 3.3 Writing Rules

| Rule | Detail |
|------|--------|
| **Sentence case** | Headlines, buttons, labels |
| **Active voice** | "Publish your showroom" not "Your showroom can be published" |
| **Numbers** | Digits for metrics (47 views), words for steps (three steps) |
| **Currency** | ETB 1,000 / $29 (not 1000 ETB) |
| **Dates** | Aug 24, 2026 (not 24/08/2026) |
| **Amharic** | Ge'ez script for UI, Latin transliteration for code |

---

## 4. Application Examples

### 4.1 Buttons

| Variant | Style | Usage |
|---------|-------|-------|
| **Primary** | Blue (`bg-primary`), white text, `radius-md` | The one main action per screen |
| **Secondary** | Gray-100 bg, Dark text, `radius-md`, border | Secondary actions |
| **Outline** | Transparent bg, border, foreground text | Other actions |
| **Ghost** | Transparent, Dark text, no border | Subtle |
| **Destructive** | Red bg, white text | Delete, cancel subscription |
| **Success** | Green (`bg-success`), white text | Confirmations |

### 4.2 Cards

| Variant | Style | Usage |
|---------|-------|-------|
| **Default** | White/Light bg, `radius-lg`, `shadow-sm`, `space-4` padding | Default |
| **Elevated** | White bg, `radius-xl`, `shadow-lg` | Modals, sheets |
| **Interactive** | Default + `shadow-md` hover, `transition-shadow` | Clickable |
| **Bordered** | Gray-200 border, no shadow | Dense lists |

### 4.3 Forms

| Element | Style |
|---------|-------|
| **Label** | `body-sm`, Dark text, `space-1` above input |
| **Input** | `radius-md`, Gray-200 border, `focus:border-primary focus:ring-2 focus:ring-ring` |
| **Error** | Red border, Red text `body-xs`, `space-1` below |
| **Helper** | Gray-500, `body-xs` |
| **Disabled** | Gray-100 bg, Gray-400 text, `cursor-not-allowed` |

---

## 5. Marketing Assets

### 5.1 Social Media Templates

| Platform | Dimensions | Template |
|----------|------------|----------|
| **Twitter/X** | 1200x675 | Hero + logo + tagline |
| **LinkedIn** | 1200x627 | Case study + metric |
| **Instagram Feed** | 1080x1080 | Quote + brand gradient |
| **Instagram Story** | 1080x1920 | Poll/quiz + CTA |
| **YouTube Thumbnail** | 1280x720 | Bold text + metric + face |

### 5.2 Email Templates

| Type | Header | Footer |
|------|--------|--------|
| **Transactional** | Logo + "Nodbusiness" | Unsubscribe + Privacy + Address |
| **Marketing** | Hero image + headline | Social links + Unsubscribe |
| **Digest** | Logo + "Your Weekly Summary" | Preferences + Unsubscribe |

---

## 6. Do's and Don'ts

| Do | Don't |
|----|-------|
| Use blue (`primary`) for the one main action | Use status colours (amber, green, red) for decoration |
| Respect clear space around logo | Place logo on busy backgrounds |
| Use Inter for all body text | Use custom fonts for body copy |
| Respect reduced motion | Animate everything |
| Write in active voice | Use passive voice |
| "You" not "The user" | "The user can..." |
| Amharic for Ethiopian users | English-only for Ethiopian users |

---

## 6. Asset Library

| Asset | Location | Format |
|-------|----------|--------|
| **Logos** | `/brand/logos/` | SVG, PNG (1x, 2x, 3x) |
| **Favicons** | `/brand/favicons/` | ICO, PNG (16, 32, 48, 192, 512) |
| **Social Templates** | `/brand/templates/social/` | Figma, PSD |
| **Email Templates** | `/brand/templates/email/` | MJML, HTML |
| **Illustrations** | `/brand/illustrations/` | SVG |
| **Icon Set** | `/brand/icons/` | SVG, React components |
| **Font Files** | `/brand/fonts/` | WOFF2, variable |

---

## 7. Brand Governance

| Role | Responsibility |
|------|----------------|
| **Brand Owner** (Founder) | Final approval on all external-facing assets |
| **Design Lead** | Day-to-day decisions, design system maintenance |
| **Marketing** | Campaign assets, social, email |
| **Product** | UI components, in-app copy, onboarding |
| **DevRel** | Developer-facing assets, docs styling |

**Review Process:** All external assets → Design Lead review → Brand Owner approval (if new pattern)

---

*Confidential. For Nodbusiness Technologies internal use only.*