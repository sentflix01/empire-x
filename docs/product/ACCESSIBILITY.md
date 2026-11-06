# Nodbusiness — Accessibility Standards

> Making Nodbusiness usable by everyone, including users with disabilities and users on low-end devices.
> Standard: WCAG 2.1 Level AA
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| WCAG | Web Content Accessibility Guidelines |
| A11y | Accessibility (short form of "a-ccessibilit-y") |
| ARIA | Accessible Rich Internet Applications — HTML accessibility attributes |
| ADA | Americans with Disabilities Act (US) |
| NVDA | NonVisual Desktop Access — free screen reader (Windows) |
| UI | User Interface |
| UX | User Experience |
| CSS | Cascading Style Sheets |
| DOM | Document Object Model |
| CTA | Call to Action |
| RGB | Red Green Blue — color model |
| LCP | Largest Contentful Paint — Core Web Vital |
| FCP | First Contentful Paint — Core Web Vital |

---

## Why Accessibility Matters for Nodbusiness

1. **Legal obligation:** ADA (US users), WCAG (international best practice), Ethiopian disability rights
2. **Larger market:** ~15% of the world's population has some form of disability
3. **Low-end devices:** Many users in emerging markets have older phones with smaller screens and slower CPUs
4. **Assistive technology:** Screen readers are widely used globally (NVDA, VoiceOver, TalkBack)
5. **Good UX:** Accessible apps are better apps for everyone

---

## Current Status

| Area | Status | Priority |
|---|---|---|
| Color contrast (4.5:1 text, 3:1 UI) | ✅ axe: 0 failures on 44 page states, light and dark (6 Nov 2026, audit F-041) | Keep checking new UI |
| Keyboard navigation | ⚠️ Partial | High |
| Screen reader (ARIA labels) | ⚠️ Partial | High |
| Focus management | ⚠️ Not audited | Medium |
| Image alt text | ⚠️ Partial | High |
| Form labels | ✅ Labels present | Low |
| Motion (prefers-reduced-motion) | ❌ Not implemented | Medium |
| Font size scaling | ⚠️ Fixed sizes in places | Medium |
| Touch target size (44px minimum) | ⚠️ Some buttons are 32px | High |

---

## WCAG 2.1 Requirements — Level AA

### 1. Perceivable

#### Color Contrast
All text must meet minimum contrast ratios:
- Normal text (< 18pt): **4.5:1**
- Large text (≥ 18pt or 14pt bold): **3:1**
- UI components and focus indicators: **3:1**

**How it is met (audit F-041, 6 Nov 2026):**
- `app/globals.css` redefines the Tailwind shades used for text and behind white text so they pass 4.5:1: amber-500 `#b45309`, amber-600 `#92400e`, red-500 `#c81e1e`, green-600 `#157a3a`, yellow-600 `#a16207`, blue-500 `#2563eb`; `--muted-foreground` and `--destructive` are darker in light mode and lighter in dark mode. Shades 400 and below are for decoration only.
- In dark mode the same text classes switch to lighter shades, and pale tints (`bg-*-50`) become dark tints.
- Colours chosen by businesses (showroom theme colour) go through `lib/contrast.ts`: `themeTextStyle()` with the `biz-text` class for text, `fillForWhiteText()` for fills behind white text. Never put a business colour straight into `color` or behind `text-white`.

**How to check:** `note/2026-11-05-international-audit/scripts/browser/a11y-elements.cjs` (axe-core, every failing element; `THEME=dark` for dark mode), or the axe DevTools browser extension.

#### Images
All `<img>` and `<Image>` components must have meaningful `alt` text:
```tsx
// ❌ Wrong
<Image src={avatar} alt="" />

// ✅ Correct
<Image src={avatar} alt={`${user.display_name}'s profile photo`} />

// ✅ Decorative images (no meaning)
<Image src={decoration} alt="" aria-hidden="true" />
```

#### Video (when built)
- Captions required for all video content
- Audio descriptions for videos where the visual content conveys information

### 2. Operable

#### Keyboard Navigation
All interactive elements must be reachable and operable via keyboard:

```tsx
// ✅ Required on all interactive custom components
<button
  onClick={handleClick}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
  tabIndex={0}
>
```

**Tab order:** Must follow logical reading order. Check by pressing Tab through the page.

#### Focus Indicators
Focus ring must be visible. Never do:
```css
/* ❌ Never */
*:focus { outline: none; }
```

Instead use:
```css
/* ✅ Custom focus ring */
*:focus-visible { 
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px; 
}
```

**Tailwind:** Use `focus-visible:ring-2 focus-visible:ring-primary` on interactive elements.

#### Touch Target Size
Minimum 44×44px for all tap targets on mobile:
```tsx
// ❌ Too small (32×32)
<button className="w-8 h-8">

// ✅ Minimum size
<button className="min-w-[44px] min-h-[44px]">
// Or use padding to expand the tap area:
<button className="p-3"> {/* 12px padding = larger tap area */}
```

#### No Timing Pressure
- Stories auto-advance (5 seconds) must have pause controls
- Session timeouts must warn users with sufficient time to respond

### 3. Understandable

#### Language Declaration
```html
<!-- ✅ Set in layout.tsx -->
<html lang="en">
<!-- Or dynamically for Amharic: -->
<html lang="am">
```

#### Error Messages
Form errors must be clear and associated with the field:
```tsx
// ✅ Accessible error
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-describedby="email-error"
    aria-invalid={!!emailError}
  />
  {emailError && (
    <p id="email-error" role="alert" className="text-red-500 text-sm">
      {emailError}
    </p>
  )}
</div>
```

### 4. Robust

#### ARIA Landmarks
```tsx
// Semantic HTML first, ARIA to supplement
<header>...</header>
<nav aria-label="Main navigation">...</nav>
<main>...</main>
<aside aria-label="Trending topics">...</aside>
<footer>...</footer>
```

#### Screen Reader Support
Key patterns:
```tsx
// Dynamic content updates
<div aria-live="polite" aria-atomic="true">
  {/* Notifications, cart count, etc. */}
</div>

// Loading states
<div aria-busy={loading} aria-label="Loading posts">

// Icon-only buttons
<button aria-label="Like post by John">
  <Heart className="w-4 h-4" aria-hidden="true" />
</button>

// Modal dialogs
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Create Post</h2>
```

---

## Low-Data / Low-End Device Support

Important for users on slower connections:

### Image Optimisation
```tsx
// Use next/image — automatic WebP conversion + lazy loading
import Image from 'next/image';
<Image
  src={url}
  alt={alt}
  loading="lazy"        // ✅ Already set in most places
  placeholder="blur"    // Show blur hash while loading (future)
/>
```

### Reduce JavaScript Bundle
```bash
# Analyse bundle
cd frontend-next && npx @next/bundle-analyzer
```

Target: < 150KB initial JS bundle.

### Prefers-Reduced-Motion
```tsx
// Respect user's animation preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// In Framer Motion
<motion.div
  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
>
```

```css
/* Global CSS override */
@media (prefers-reduced-motion: reduce) {
  .animate-marquee { animation: none; }
  .animate-spin { animation: none; }
  .animate-pulse { animation: none; }
}
```

---

## Accessibility Audit Process

### Automated (every sprint)
```bash
# axe-core integration
npm install --save-dev @axe-core/react
# Add to _app.tsx in development only
```

### Manual (every major release)
1. Keyboard-only navigation test (Tab through entire app)
2. Screen reader test (NVDA on Windows, VoiceOver on Mac, TalkBack on Android)
3. Zoom to 200% — content must not break
4. Color blindness simulation (Chrome DevTools → Rendering → Emulate vision deficiency)

### Tools
- **axe DevTools** — browser extension
- **WAVE** — web accessibility evaluation tool
- **Contrast Checker** — webaim.org/resources/contrastchecker/
- **Lighthouse** — built into Chrome DevTools

---

## Accessibility Bug Priority

| Severity | Definition | Response time |
|---|---|---|
| Critical | Blocks all users with disability from completing a task | Fix before release |
| High | Significantly impairs usability for disabled users | Fix in next sprint |
| Medium | Difficult but possible to use | Fix in next 30 days |
| Low | Minor inconvenience | Fix when convenient |
