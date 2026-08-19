# Design — Brand Color Consistency & Chat Mobile Fix

## Overview

Two targeted changes:
1. Replace all Telegram-blue (`#0088cc`) references in the messaging UI with Nodbusiness brand tokens.
2. Fix the mobile chat layout so the input area is never obscured by the bottom nav or the virtual keyboard.
3. Clean up duplicate CSS variable declarations in `globals.css`.

No new components are introduced. No dependencies are added.

---

## Design Token Reference

All color usage in app chrome must derive from these three sources of truth:

| Token | CSS Variable | Tailwind Class | Hex (light) | Role |
|---|---|---|---|---|
| Primary | `var(--ex-blue)` / `hsl(var(--primary))` | `bg-primary`, `text-primary` | `#2563eb` | CTA buttons, active states, links |
| Accent | `var(--ex-purple)` / `hsl(var(--accent))` | `bg-accent`, `text-accent` | `#7c3aed` | Gradient end, secondary brand |
| Gold | `var(--ex-gold)` | `text-empire-gold` | `#f59e0b` | Badges, notifications, selected nav |

For outgoing message bubbles we need a light blue tint. We derive it from the primary:
- **Light bubble** (own messages): `#dbeafe` — Tailwind `blue-100`, readable, on-brand, distinct from incoming white/card bubbles.

---

## Change 1 — `globals.css` deduplication

### Problem
The file has two `@layer base` blocks. The second block (starting after the `@layer utilities` closing brace) is leftover content that was accidentally appended. It redefines `--background`, `--foreground`, etc. and introduces orphaned `--brand-primary`/`--brand-secondary` variables that nothing in the canonical component code uses. The duplicate block also has bare CSS property assignments outside any selector (`--brand-error: …` etc.) which are invalid.

### Solution
Remove the entire duplicate block — everything after the first `@layer utilities { … }` closing brace. Keep:
- The first `@layer base { :root { … } .dark { … } }` (the canonical one with `--ex-blue`, `--ex-purple`, `--ex-gold`)
- The second `@layer base { * { … } body { … } }` (resets)
- The `@layer utilities { … }` block
- All the animation keyframes, utility classes, and safe-area helpers below it

After cleanup the file must have exactly one `:root { … }` block and one `.dark { … }` block.

---

## Change 2 — `ChatRoom.tsx` color fixes

### Problem
```ts
const TG_BLUE = "#0088cc";       // Telegram teal-blue
const TG_BLUE_LIGHT = "#effdde"; // WhatsApp/Telegram green-tinted bubble
```
These values are used for: header background, send button, sender name text, reply preview accent, check-check icon, online dot border, and outgoing bubble background.

### Solution
Remove the two constants and replace every usage with the brand token equivalents:

| Old | New | Where |
|---|---|---|
| `style={{ backgroundColor: TG_BLUE }}` (header) | `className="bg-primary"` | Chat room header `<div>` |
| `border-[#0088cc]` (online dot) | `className="border-primary"` | Online presence dot |
| `style={{ color: TG_BLUE }}` (sender name) | `className="text-primary"` | Group/channel sender name |
| `style={isMe ? { backgroundColor: TG_BLUE_LIGHT } : {}}` | `className="bg-blue-100 dark:bg-blue-900/40"` | Own message bubble |
| `border-blue-500` (reply quote accent — already Tailwind) | keep as-is | Reply quote left border |
| `style={{ color: TG_BLUE }}` (reply preview text) | `className="text-primary"` | Reply preview header |
| `style={{ color: TG_BLUE, opacity: 0.7 }}` (checkcheck) | `className="text-primary opacity-70"` | Double-check icon |
| `style={{ backgroundColor: TG_BLUE }}` (send button) | `className="bg-primary"` | Send/confirm button |

The chat room background (`#cfd7dc`) is kept — it's a neutral grey that is not Telegram-branded and works well as a message area background in both themes. We will convert it to a CSS variable reference for maintainability: `bg-[#cfd7dc] dark:bg-[#1e2a35]`.

---

## Change 3 — `CreateChannelModal.tsx` color fixes

### Problem
`TG_BLUE` is used for: modal title, icon circle background, input focus border, textarea ring, info-box icon & text, and Create button background.

### Solution
Remove `const TG_BLUE = "#0088cc"` and replace:

| Old | New |
|---|---|
| `style={{ color: TG_BLUE }}` (title) | `className="text-primary"` |
| `style={{ backgroundColor: TG_BLUE }}` (icon circle) | `className="bg-primary"` |
| `focus-visible:border-[#0088cc]` (input) | `focus-visible:border-primary` |
| `focus-visible:ring-[#0088cc]/30` (textarea) | `focus-visible:ring-primary/30` |
| `style={{ color: TG_BLUE }}` (Radio icon in info box) | `className="text-primary"` |
| `style={{ color: TG_BLUE }}` (info box label) | `className="text-primary"` |
| `style={{ backgroundColor: TG_BLUE }}` (Create button) | Remove inline style, use `className="bg-primary hover:bg-primary/90"` (or keep using shadcn `Button` default which already uses `--primary`) |

The `bg-blue-50` info box background is already on-brand (light primary tint) — keep it.

---

## Change 4 — `CreateGroupModal.tsx` color fixes

### Problem
`TG_BLUE` is used for: modal title, group avatar background (`#4CAF50` — a hardcoded green also used for the group icon), contact avatar initials circles, selected-chip avatar circles, selection checkmark circles, focus border, and Create button.

### Solution
Remove `const TG_BLUE = "#0088cc"` and replace:

| Old | New |
|---|---|
| `style={{ color: TG_BLUE }}` (title) | `className="text-primary"` |
| `style={{ backgroundColor: "#4CAF50" }}` (group icon — green) | `className="bg-accent"` (purple — brand accent, not random green) |
| `style={{ backgroundColor: TG_BLUE }}` (selected chip avatar) | `className="bg-primary"` |
| `style={{ backgroundColor: TG_BLUE }}` (contact avatar circle) | `className="bg-primary"` |
| `style={{ backgroundColor: TG_BLUE }}` (selection check overlay) | `className="bg-primary"` |
| `focus-visible:border-[#0088cc]` (group name input) | `focus-visible:border-primary` |
| `style={{ backgroundColor: TG_BLUE }}` (Create button) | `className="bg-primary hover:bg-primary/90"` (remove inline style) |

---

## Change 5 — Mobile chat height & keyboard fix

### Problem Analysis

In `AppLayout`, `isImmersiveRoute` is true for `/messages/:id`:
```ts
const isImmersiveRoute = isShowroomBuilder || pathname.startsWith("/messages/");
```

When `isImmersiveRoute` is true, the mobile bottom nav is **not rendered** (the entire `{!isShowroomBuilder && !isImmersiveRoute && (…)}` block is skipped).

But in `ChatRoom.tsx`, the root element still uses:
```tsx
className="flex flex-col h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-3.5rem)] overflow-hidden"
```

The comment says "Mobile: subtract top header (3.5rem) + bottom nav (4rem) = 7.5rem". Since there is **no bottom nav on this route**, the 4rem subtraction is wrong. The chat room only occupies `100dvh − 7.5rem` instead of the full available space below the header, leaving a 4rem dead zone at the bottom. On many phones this is exactly where the keyboard appears, compressing the layout and pushing the input out of view.

Additionally, the input area wrapper uses:
```tsx
<div className="md:pb-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
```
This `md:pb-0` class has no mobile counterpart and does nothing to protect the input from the keyboard. The `paddingBottom` inline style is also on the inner wrapper, not the outer fixed element, so it doesn't compose correctly with `flex` layout.

### Solution

**Step A — Fix the height calculation in `ChatRoom.tsx`**

Since the bottom nav is absent on this route, mobile only needs to subtract the top header:
```tsx
// Before
className="flex flex-col h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-3.5rem)] overflow-hidden"

// After
className="flex flex-col h-[calc(100dvh-3.5rem)] overflow-hidden"
```
`100dvh` (dynamic viewport height) already shrinks when the browser chrome/keyboard appears on mobile, so using it without a fixed nav subtraction is the correct approach. `dvh` is supported in all modern mobile browsers (iOS 15.4+, Android Chrome 108+).

**Step B — Remove the broken inner padding div, apply safe-area to the outer input container**

```tsx
// Before — inner wrapper with broken padding
<div className="bg-card border-t border-border/30 shrink-0">
  <div className="md:pb-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
    {/* …reply/edit banners and input row… */}
  </div>
</div>

// After — safe-area padding on the outer wrapper directly
<div
  className="bg-card border-t border-border/30 shrink-0"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
>
  {/* …reply/edit banners and input row… */}
</div>
```

This ensures the entire input area (including reply/edit banners) is pushed above the home indicator on iPhone, and the outer container height is part of the flex column so the message list correctly fills the remaining space.

**Step C — Ensure `AppLayout` main content is correctly sized for immersive routes**

The current `<main>` for immersive routes is:
```tsx
className="flex-1 min-w-0 ... overflow-hidden"
```
This is fine — `flex-1` lets the main grow to fill the `flex flex-col min-h-screen` root. No change needed here.

---

## Files Changed Summary

| File | Change |
|---|---|
| `app/globals.css` | Remove duplicate `@layer base` block + orphaned variable declarations |
| `views/ChatRoom.tsx` | Replace all `TG_BLUE`/`TG_BLUE_LIGHT` usages; fix height calc; fix safe-area padding structure |
| `components/messaging/CreateChannelModal.tsx` | Replace all `TG_BLUE` usages with brand tokens |
| `components/messaging/CreateGroupModal.tsx` | Replace all `TG_BLUE` and `#4CAF50` usages with brand tokens |

Total: **4 files**. No new files. No dependency changes.

---

## Visual Summary

### Chat header
- **Before:** Telegram teal `#0088cc`
- **After:** Nodbusiness primary blue `hsl(var(--primary))` = `#2563eb`

### Own message bubbles
- **Before:** Telegram green-tinted `#effdde`
- **After:** Light brand blue `bg-blue-100` / dark `bg-blue-900/40`

### Modals (Channel & Group)
- **Before:** Telegram teal on titles, avatars, buttons
- **After:** Nodbusiness primary blue on all chrome

### Mobile chat height
- **Before:** `calc(100dvh - 7.5rem)` — incorrectly subtracts a nav bar that doesn't exist
- **After:** `calc(100dvh - 3.5rem)` — only subtracts the actual top header
