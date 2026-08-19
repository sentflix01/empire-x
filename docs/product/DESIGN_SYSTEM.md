# Halehame — Design System

> The visual language of Halehame. Consistent design = trusted product.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| UI | User Interface |
| UX | User Experience |
| CSS | Cascading Style Sheets |
| HEX | Hexadecimal — color code format (e.g., #2563eb) |
| RGB | Red Green Blue — color model for screens |
| HSL | Hue Saturation Lightness — CSS color model |
| SVG | Scalable Vector Graphics |
| PNG | Portable Network Graphics |
| A11y | Accessibility (short form) |
| WCAG | Web Content Accessibility Guidelines |
| CTA | Call to Action |
| DPI | Dots Per Inch — screen resolution |
| RTL | Right-to-Left — text direction for Arabic etc. |
| LTR | Left-to-Right — standard English/Amharic direction |

---

## Brand Identity

### Name & Logo
- **Name:** Halehame
- **Tagline:** "The Global Superapp"
- **Logo:** Crown icon (👑) — symbolises excellence, ambition, and achievement
- **Logo file:** `frontend-next/public/brand/halehame-logo.png`

### Brand Voice
- **Direct** — say what you mean, no filler
- **Warm** — we're building community, not a transaction machine
- **Global-first** — accessible to users worldwide, with local relevance per region
- **Multilingual** — English primary, with full support for local languages
- **Empowering** — every feature helps someone earn more, connect better, or build something

---

## Color System

### Brand Tokens (CSS Variables in `globals.css`)

```css
:root {
  /* Halehame brand colours */
  --ex-gold:   #D4AF37;  /* Primary gold — excellence, wealth, achievement */
  --ex-blue:   #2563EB;  /* Empire Blue — trust, technology, sky */
  --ex-purple: #7C3AED;  /* Empire Purple — premium, creativity */
  
  /* Semantic tokens (light mode) */
  --background: 0 0% 100%;          /* Pure white */
  --foreground: 222.2 84% 4.9%;     /* Near-black text */
  --primary: 221.2 83.2% 53.3%;     /* Empire Blue */
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;       /* Light grey backgrounds */
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --border: 214.3 31.8% 91.4%;
  --card: 0 0% 100%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --card: 222.2 84% 4.9%;
  /* ... */
}
```

### Color Usage Rules

| Color | Use | Never use for |
|---|---|---|
| Gold (`--ex-gold`, amber-500) | CTAs, highlights, premium features, icons | Body text (low contrast) |
| Blue (`--ex-blue`, primary) | Links, interactive elements, info states | Errors |
| Purple (`--ex-purple`) | Channels, groups, creative features | Warning states |
| Green (`green-500/600`) | Success states, online presence, money in | Error states |
| Red (`red-500/600`) | Errors, destructive actions, money out | Neutral UI |
| `text-muted-foreground` | Secondary text, metadata, timestamps | Primary headings |

### Gradient Palette
```css
/* Marketplace CTAs and banners */
.bg-empire-gradient {
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
}

/* Gold premium feel */
background: linear-gradient(135deg, #f59e0b, #d97706);

/* Chat header (brand gradient) */
background: linear-gradient(135deg, var(--ex-blue) 0%, var(--ex-purple) 100%);
```

---

## Typography

### Font Stack
```css
/* Display headings */
font-family: 'Playfair Display', serif;  /* class: font-display */

/* Body text */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace (codes, coupon codes) */
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

### Type Scale (Tailwind)
| Class | Size | Use |
|---|---|---|
| `text-3xl font-bold font-display` | 30px | Page headings |
| `text-2xl font-bold font-display` | 24px | Section headings |
| `text-xl font-semibold` | 20px | Card titles |
| `text-base` | 16px | Body text |
| `text-sm` | 14px | Secondary text, form labels |
| `text-xs` | 12px | Metadata, timestamps, badges |
| `text-[10px]` | 10px | Only for badge labels |

### Amharic Typography
- Amharic uses the **Ge'ez script** — ensure fonts support Unicode range `U+1200–U+137F`
- System fonts on Android/iOS include Noto Sans Ethiopic
- Verify text renders correctly on: Samsung One UI, Xiaomi MIUI, stock Android
- **Line height for Amharic:** Add `leading-relaxed` (`1.625`) — Ge'ez script needs more vertical space

---

## Spacing System

All spacing uses **Tailwind's 4px base unit**:

| Token | Value | Common use |
|---|---|---|
| `gap-1` | 4px | Tight icon + label pairs |
| `gap-2` | 8px | Button icon + text |
| `gap-3` | 12px | List items |
| `gap-4` | 16px | Card internal padding |
| `gap-6` | 24px | Section spacing |
| `p-4` | 16px | Standard card padding |
| `p-5` | 20px | Comfortable card padding |
| `px-4 py-3` | 16px/12px | Navigation items |
| `rounded-xl` | 12px | Standard border radius |
| `rounded-2xl` | 16px | Cards, modals |
| `rounded-full` | 9999px | Pills, avatars, buttons |

**Rule:** Never use arbitrary pixel values in `style={}` for spacing. Always use Tailwind tokens.

---

## Component Patterns

### Buttons

```tsx
/* Primary — amber gradient, used for main CTAs */
<Button className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
  Create Showroom
</Button>

/* Secondary — outline */
<Button variant="outline" className="rounded-full">
  Cancel
</Button>

/* Destructive */
<Button variant="destructive" className="rounded-full">
  Delete
</Button>

/* Ghost (minimal) */
<Button variant="ghost" className="rounded-full text-muted-foreground">
  Skip
</Button>
```

**Button rules:**
- All buttons use `rounded-full` for pill shape
- Primary CTAs use amber/gold gradient
- Maximum 1 primary CTA per screen area
- Loading state: `<Loader2 className="w-4 h-4 animate-spin mr-2" />`

### Cards

```tsx
/* Standard card */
<div className="bg-card rounded-2xl border border-border/50 p-4">
  {/* content */}
</div>

/* Elevated card (modal/highlight) */
<div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
  {/* content */}
</div>
```

### Input Fields

```tsx
/* Standard text input */
<input className="w-full h-10 px-3 text-sm bg-secondary/50 border border-border/50 rounded-xl outline-none focus:ring-1 focus:ring-amber-500/30" />

/* Search input (with icon) */
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
  <Input className="pl-9 rounded-full bg-card border-border/50" />
</div>
```

### Avatar

```tsx
/* User avatar with fallback initial */
<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
  {avatarUrl 
    ? <Image src={avatarUrl} alt={name} fill className="object-cover" unoptimized />
    : name.charAt(0).toUpperCase()
  }
</div>
```

### Loading States

```tsx
/* Full page loading */
<div className="flex justify-center py-20">
  <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
</div>

/* Skeleton loading (preferred for list pages) */
<Skeleton className="h-4 w-3/4" />
<Skeleton className="h-4 w-1/2" />

/* Inline button loading */
<Button disabled>
  <Loader2 className="w-4 h-4 animate-spin mr-2" />
  Saving...
</Button>
```

### Empty States

```tsx
/* Standard empty state */
<div className="text-center py-16">
  <ShoppingBag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
  <h3 className="font-display text-lg font-bold">No products yet</h3>
  <p className="text-sm text-muted-foreground mt-1">Be the first to list a product!</p>
  <Button className="mt-4 rounded-full">List a Product</Button>
</div>
```

---

## Iconography

**Library:** Lucide React (`lucide-react`)

### Standard icon sizes
| Size | Class | Use |
|---|---|---|
| Large | `w-6 h-6` | Page header icons |
| Medium | `w-5 h-5` | Navigation, card icons |
| Small | `w-4 h-4` | Inline with text |
| XSmall | `w-3.5 h-3.5` | Tags, badges |
| Micro | `w-3 h-3` | Metadata |

### Common icon → concept mapping

| Icon | Concept |
|---|---|
| `Crown` | Showrooms, premium |
| `ShoppingBag` | Marketplace, products |
| `MessageCircle` | Messages, chat |
| `Bell` | Notifications |
| `Star` / `Heart` | Likes, reviews |
| `Shield` | Security, protection |
| `BadgeCheck` | Verification |
| `TrendingUp` | Analytics, trending |
| `MapPin` | Location |
| `Truck` | Delivery |

---

## Motion & Animation

**Principle:** Animation serves communication, not decoration.

### Approved animations
```css
/* Page transitions (Framer Motion) */
initial={{ opacity: 0, y: 12 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.2 }}

/* Card flip (profile view toggle) */
initial={{ opacity: 0, rotateY: -18 }}
animate={{ opacity: 1, rotateY: 0 }}
transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
```

### Never animate
- Text that must be read immediately
- Form errors
- Loading spinners (use CSS `animate-spin` only)
- When `prefers-reduced-motion: reduce` is set

---

## Dark Mode

All UI must look good in both light and dark mode.

**Rules:**
- Never hardcode `#ffffff` or `#000000` — use Tailwind tokens (`bg-card`, `text-foreground`)
- Images: add `dark:opacity-90` if they look too harsh in dark mode
- Shadows: use `shadow-sm` — heavier shadows look bad in dark mode
- Test every new component in dark mode before shipping

**Common mistakes:**
```tsx
/* ❌ Wrong — hardcoded color */
<div style={{ backgroundColor: '#f9fafb' }}>

/* ✅ Correct — semantic token */
<div className="bg-secondary/40">

/* ❌ Wrong — no dark mode variant */
<div className="bg-blue-50">

/* ✅ Correct — with dark mode */
<div className="bg-blue-50 dark:bg-blue-950/30">
```

---

## Responsive Breakpoints

| Breakpoint | Min width | Use |
|---|---|---|
| (mobile-first default) | 0px | Phone portrait |
| `sm:` | 640px | Phone landscape |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop (sidebar visible) |
| `xl:` | 1280px | Wide desktop (right panel visible) |
| `2xl:` | 1536px | Ultra-wide |

**Mobile-first rule:** Design for 375px width first. Add breakpoints to enhance on larger screens, not to fix mobile breakage.
