# Implementation Plan: Brand Color Consistency & Chat Mobile Fix

## Overview

Fix two issues in the Nodbusiness frontend:
1. Replace all Telegram-blue (`#0088cc`) color references in messaging UI with the three Nodbusiness brand tokens (blue `#2563eb`, purple `#7c3aed`, gold `#f59e0b`).
2. Fix the mobile chat layout so the input field is never hidden behind the bottom nav zone or the on-screen keyboard.
3. Remove the duplicate CSS variable block from `globals.css`.

All changes are in 4 files: `globals.css`, `ChatRoom.tsx`, `CreateChannelModal.tsx`, `CreateGroupModal.tsx`.

## Tasks

- [x] 1. Clean up duplicate CSS variable declarations in globals.css
  - Remove the duplicate `@layer base` block that begins after the first `@layer utilities { }` closing brace in `app/globals.css`
  - This duplicate block re-declares `:root` and `.dark` variables using the old `--brand-primary`, `--brand-secondary` naming, and also contains bare CSS property assignments outside any selector
  - After removal the file must contain exactly one `:root { … }` block and one `.dark { … }` block
  - Verify the file still has no stray braces

- [x] 2. Fix ChatRoom.tsx — replace Telegram-blue with Nodbusiness brand tokens
  - Remove the two constants at the top of the file: `const TG_BLUE = "#0088cc"` and `const TG_BLUE_LIGHT = "#effdde"`
  - Chat header `<div>`: replace `style={{ backgroundColor: TG_BLUE }}` with `className="bg-primary"`
  - Online presence dot: replace `border-[#0088cc]` with `border-primary` in the Tailwind class string
  - Own message bubble container: replace `style={isMe ? { backgroundColor: TG_BLUE_LIGHT } : {}}` with conditional Tailwind classes `isMe ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-card'` and remove the style prop
  - Sender name paragraph in group/channel: replace `style={{ color: TG_BLUE }}` with `className="text-primary"`
  - Reply preview "Reply to" label: replace `style={{ color: TG_BLUE }}` with `className="text-primary"`
  - Double-check icon (`<CheckCheck>`): replace `style={{ color: TG_BLUE, opacity: 0.7 }}` with `className="text-primary opacity-70"`
  - Send/confirm button: replace `style={{ backgroundColor: TG_BLUE }}` with `className="bg-primary hover:bg-primary/90"`

- [x] 3. Fix ChatRoom.tsx — mobile height calculation and safe-area padding
  - Depends on: 2
  - Change the root element height classes from `h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-3.5rem)]` to `h-[calc(100dvh-3.5rem)]` — the immersive route has no bottom nav so the 4rem nav subtraction is wrong
  - Remove the inner `<div className="md:pb-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>` wrapper inside the input area
  - Move `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` directly onto the outer input container `<div className="bg-card border-t border-border/30 shrink-0">`
  - Ensure the reply-preview banner, edit-mode banner, and text input row are direct children of this outer container
  - Apply the same safe-area padding to the `!canSend` fallback bar

- [x] 4. Fix CreateChannelModal.tsx — replace Telegram-blue with Nodbusiness brand tokens
  - Remove `const TG_BLUE = "#0088cc"` from the file
  - Modal title `<h2>`: replace `style={{ color: TG_BLUE }}` with `className="text-primary font-semibold text-lg"`
  - Icon circle `<div>`: replace `style={{ backgroundColor: TG_BLUE }}` with `className="bg-primary"`
  - Channel name `<Input>`: replace `focus-visible:border-[#0088cc]` with `focus-visible:border-primary`
  - Description `<Textarea>`: replace `focus-visible:ring-[#0088cc]/30` with `focus-visible:ring-primary/30`
  - Info box `<Radio>` icon: replace `style={{ color: TG_BLUE }}` with `className="text-primary"`
  - Info box label `<span>`: replace `style={{ color: TG_BLUE }}` with `className="text-primary font-medium"`
  - Create Channel `<Button>`: remove `style={{ backgroundColor: TG_BLUE }}` — rely on the default Button `bg-primary` variant

- [x] 5. Fix CreateGroupModal.tsx — replace Telegram-blue and off-brand green with Nodbusiness brand tokens
  - Remove `const TG_BLUE = "#0088cc"` from the file
  - Modal title `<h2>`: replace `style={{ color: TG_BLUE }}` with `className="text-primary font-semibold text-lg"`
  - Group icon circle: replace `style={{ backgroundColor: "#4CAF50" }}` (random green) with `className="bg-accent"`
  - Group name `<Input>`: replace `focus-visible:border-[#0088cc]` with `focus-visible:border-primary`
  - Selected-chip avatar circles: replace `style={{ backgroundColor: TG_BLUE }}` with `className="bg-primary"`
  - Contact list avatar circles: replace `style={{ backgroundColor: TG_BLUE }}` with `className="bg-primary"`
  - Selection checkmark overlay circle: replace `style={{ backgroundColor: TG_BLUE }}` with `className="bg-primary"`
  - Create Group `<Button>`: remove `style={{ backgroundColor: TG_BLUE }}` and rely on the default Button `bg-primary` variant

- [x] 6. Fix Messages.tsx — replace TG_BLUE colors and verify real-chat end-to-end wiring
  - Remove `const TG_BLUE = "#0088cc"` from `views/Messages.tsx`
  - Page title `<h1>`: replace `style={{ color: TG_BLUE }}` with `className="font-display text-2xl font-bold text-primary"`
  - Active tab button: replace `style={tab === t.id ? { backgroundColor: TG_BLUE } : {}}` with a conditional Tailwind class `tab === t.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'` and remove the style prop entirely
  - Loading spinner: replace `border-t-[#0088cc]` with `border-t-primary`
  - `getAvatarColor` function: replace all three hardcoded returns (`"#0088cc"`, `"#4CAF50"`, `TG_BLUE`) with brand tokens — channel → `var(--ex-blue)`, group → `var(--ex-purple)`, DM → `var(--ex-blue)`
  - `ContactItem` fallback avatar div: replace `style={{ backgroundColor: "#0088cc", ... }}` with `className="... bg-primary"`
  - Real-chat wiring audit — verify the following are all correctly connected:
    - Frontend `socket.ts`: `getSocket()` connects to `NEXT_PUBLIC_API_BASE_URL` with JWT auth token from `localStorage` ✓
    - Backend `socket.js`: JWT middleware authenticates every socket connection, joins `conv:<id>` rooms on `join_conversation` event ✓
    - Backend `messages.js` POST route: calls `emitNewMessage(convId, message)` after INSERT ✓
    - `ChatRoom.tsx`: emits `join_conversation` on mount (after socket connect), listens for `new_message`, `message_edited`, `message_deleted` ✓
    - Real-mode filter: `Messages.tsx` already filters out DMs containing seed users when `realMode === true` ✓
  - If any wiring is broken (missing emit, wrong event name, socket not joining room), fix it
  - Verify the backend `socket.js` also emits `message_edited` and `message_deleted` events — check if those are emitted from the PUT/DELETE message routes and add them if missing

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "4", "5", "6"] },
    { "wave": 2, "tasks": ["3"] }
  ],
  "dependencies": {
    "3": ["2"]
  }
}
```

Tasks 1, 2, 4, 5, 6 can all run in parallel in wave 1. Task 3 must follow task 2 (both edit `ChatRoom.tsx`).

## Notes

- The chat background color `#cfd7dc` is kept — it is a neutral warm-grey, not Telegram-branded.
- The Telegram bot settings button (`#2CA5E0`) in `TelegramSettings.tsx` is intentionally left unchanged — it uses Telegram's own brand color, which is appropriate there.
- Social-link icon colors in `BuilderPreview.tsx` (Facebook blue, WhatsApp green, etc.) are also left unchanged — those are third-party brand colors.
- All brand token replacements use Tailwind classes where possible (`bg-primary`, `text-primary`) rather than inline `style` props, so they automatically respond to the dark mode CSS variable values.
