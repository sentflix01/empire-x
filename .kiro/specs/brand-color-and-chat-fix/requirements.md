# Requirements — Brand Color Consistency & Chat Mobile Fix

## Background

Nodbusiness has three official brand colors:
- **Blue** `#2563eb` — primary actions, active states, CTA buttons
- **Purple** `#7c3aed` — accent, gradient end, secondary brand moments
- **Gold** `#f59e0b` — highlights, badges, notifications, selected nav items

These are already codified as CSS variables (`--ex-blue`, `--ex-purple`, `--ex-gold`) and
as Tailwind tokens (`--primary`, `--accent`) in `globals.css`. The problem is that several
app-chrome components ignore these tokens and use Telegram's off-brand colors instead.
Additionally, the real-time chat interface has a mobile UX bug where the text input is
inaccessible on small screens.

---

## Requirement 1 — Replace all Telegram-blue with Nodbusiness brand blue

### User Story
As a user opening any part of the messaging feature, I want to see the Nodbusiness brand
identity (blue/purple/gold), not Telegram's teal/blue-green color scheme.

### Acceptance Criteria

1.1 The constant `TG_BLUE = "#0088cc"` must be removed from `ChatRoom.tsx`,
    `CreateChannelModal.tsx`, and `CreateGroupModal.tsx`. No file in the app should
    reference `#0088cc` for UI chrome.

1.2 The chat room header background must use the Nodbusiness primary blue (`#2563eb` /
    `var(--ex-blue)`), consistent with the app's primary action color.

1.3 Outgoing message bubbles must use a light blue tint that matches the brand (derived
    from the primary blue) instead of Telegram's `#effdde` (WhatsApp-green-tinted).

1.4 The send-button background, sender-name color in group chats, reply-preview accent,
    and double-check icon must all use the Nodbusiness primary blue token.

1.5 Online presence dot border in the chat header must match the header background
    (Nodbusiness blue), not `#0088cc`.

1.6 `CreateChannelModal` and `CreateGroupModal` titles, icon backgrounds, input focus
    rings, and action buttons must use the same Nodbusiness blue token — not `TG_BLUE`.

1.7 Changes must not affect user-generated content (profile photos, cover images, product
    images, showroom templates).

---

## Requirement 2 — Chat input must be reachable on mobile devices

### User Story
As a mobile user in a chat room, I want to be able to tap the message input field and
type text without it being hidden behind the navigation bar or the on-screen keyboard.

### Acceptance Criteria

2.1 The chat room layout (`ChatRoom.tsx`) must correctly calculate its available height
    on mobile. Because `/messages/:id` is an immersive route (bottom nav is hidden), the
    height calculation must NOT subtract the nav bar height on mobile.

2.2 When the on-screen keyboard appears on iOS/Android, the message input area must
    scroll into view above the keyboard — the user must not need to scroll manually.

2.3 The input area must always be visible and interactive above the iOS safe-area inset
    (home bar). `env(safe-area-inset-bottom)` padding must be applied correctly.

2.4 On desktop (`md` and above) the layout must remain unchanged — the existing
    `calc(100vh - 3.5rem)` height is correct for desktop.

2.5 The fix must work for both the message-typing input and the "edit message" mode.

2.6 The fix must not introduce a horizontal scroll or break the message list scrolling.

---

## Requirement 3 — Remove duplicate / conflicting CSS variable declarations

### User Story
As a developer maintaining this codebase, I want a single, clean definition of every
design token so that theme changes apply consistently everywhere.

### Acceptance Criteria

3.1 `globals.css` currently has duplicate `@layer base` blocks with conflicting variable
    names (`--brand-primary`, `--brand-secondary`, etc. vs. `--ex-blue`, `--ex-purple`,
    etc.). The duplicate block must be removed, leaving one canonical set of variables.

3.2 The canonical token names used in component code must be the CSS variables already
    wired to Tailwind (`--primary`, `--accent`, `--ex-blue`, `--ex-purple`, `--ex-gold`).

3.3 After cleanup, `globals.css` must still compile without errors and the app's light
    and dark modes must render correctly.

---

## Out of Scope

- Changing colors used inside user showroom templates (those are user-controlled themes).
- Changing the Telegram bot integration page's Telegram-branded button (`#2CA5E0`) —
  that button intentionally uses Telegram's own brand.
- Changing social-link icon colors in `BuilderPreview.tsx` (those are third-party brand
  colors, e.g., Facebook blue, WhatsApp green).
- Any changes to backend code.
- Rewriting or refactoring components beyond what is needed to fix the two issues above.
