# Chat Room UX — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Message Bubble Component

- [ ] Create `frontend-next/components/messaging/MessageBubble.tsx`
  - Props: `message`, `isOwn: boolean`, `onReply`, `onEdit`, `onDelete`
  - Own: right-aligned, `bg-primary text-primary-foreground`, rounded `rounded-2xl rounded-br-sm`
  - Others: left-aligned, `bg-muted`, rounded `rounded-2xl rounded-bl-sm`
  - Timestamp: `text-xs opacity-60` below bubble
  - Deleted: italic "Message deleted" with lock icon, no actions
  - Edited: `(edited)` suffix in `text-xs opacity-50`

---

## Step 2 — Context Menu (Long-press / Right-click)

- [ ] Long-press on mobile (500ms hold) → context menu appears above bubble
- [ ] Right-click on desktop → context menu at cursor
- [ ] Context menu options:
  - Reply → sets reply state, shows quote in input bar
  - Copy text → `navigator.clipboard.writeText(message.content)`
  - Edit (own messages only) → populates input with message content + "Edit mode" indicator
  - Delete (own messages only) → confirm dialog → `DELETE /api/messages/:id`
- [ ] Context menu dismisses on tap/click outside

---

## Step 3 — Reply Quote

- [ ] Reply state: when replying, show quoted message above input bar
  - Small preview: sender name + truncated content
  - × button to cancel reply
- [ ] Quoted bubble in message: small inset block at top of bubble
  - Different background, sender name, truncated content
  - Click quoted content → scrolls to original message

---

## Step 4 — Infinite Scroll (Load More Messages)

- [ ] Messages load newest first (bottom of screen = most recent)
- [ ] Scroll to top triggers `fetchPreviousPage` (older messages)
- [ ] Show loading spinner at top while fetching older messages
- [ ] Scroll position preserved after older messages are prepended
- [ ] Cursor-based: `GET /api/messages/conversations/:id/messages?before=messageId&limit=30`

---

## Step 5 — Auto-scroll Behavior

- [ ] On initial load: scroll to bottom immediately (no animation)
- [ ] On new message received: scroll to bottom IF already within 150px of bottom
- [ ] If user has scrolled up: show "↓ New message from [Name]" floating button
  - Click to scroll to bottom and dismiss

---

## Step 6 — Typing Indicator

- [ ] Emit `typing` event on input (debounced — emit every 3s while typing)
- [ ] Emit `typing` with `isTyping: false` on blur or after 3s silence
- [ ] Show "Name is typing..." with animated 3-dot bounce when received
- [ ] Hide after 4s if no new typing event

---

## Step 7 — Input Bar

- [ ] Auto-growing textarea (expands up to 5 lines)
- [ ] `Enter` to send on desktop, `Shift+Enter` for newline
- [ ] Send button: disabled when input is empty or whitespace only
- [ ] Image attach button: opens file picker, sends image message
- [ ] Input bar stays above keyboard on iOS (use `dvh` units or `visualViewport` API)
- [ ] Edit mode: input pre-filled, "Cancel edit" button, submit calls `PUT /api/messages/:id`

---

## Step 8 — Read Receipts

- [ ] Add `is_read BOOLEAN DEFAULT FALSE` to messages table (migration needed)
- [ ] Mark messages as read when conversation is open: `PUT /api/messages/conversations/:id/read`
- [ ] Backend emits `messages_read` Socket event to sender
- [ ] Frontend shows: ✓ (sent) → ✓✓ (delivered) → blue ✓✓ (read)

---

## Step 9 — Verify

- [ ] Messages appear in < 500ms after sending
- [ ] Typing indicator appears on both sides
- [ ] Reply-quote works end-to-end
- [ ] Edit + delete work and update UI in real-time
- [ ] Scroll to bottom on new message when at bottom
- [ ] "New message" button appears when scrolled up
- [ ] Input bar not covered by keyboard on iOS
