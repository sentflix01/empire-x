# Chat Room UX — Audit

## Current Architecture

- Route: `/messages/[id]`
- Backend: Socket.IO events: `new_message`, `message_edited`, `message_deleted`, `typing_updated`, `presence_updated`
- Messages: `GET /api/messages/conversations/:id/messages`
- Send: `POST /api/messages/conversations/:id/messages`

## Chat Room Layout (Global Standard — WhatsApp/iMessage Pattern)

```
┌─────────────────────────────┐
│  ← Back | [Avatar] Name     │  ← Header (sticky)
│          Online / Last seen │
├─────────────────────────────┤
│                             │
│  [Received bubble]          │  ← Left aligned, gray/muted bg
│            [Sent bubble]    │  ← Right aligned, primary color
│  [Date separator]           │  ← "Today", "Yesterday", "Aug 10"
│  [Typing indicator ...]     │
│                             │
├─────────────────────────────┤
│  📎 | Message input... | ➤  │  ← Footer (sticky, above keyboard)
└─────────────────────────────┘
```

## Message Bubble Requirements

| Feature | Standard |
|---------|----------|
| Own messages | Right-aligned, primary color background |
| Others' messages | Left-aligned, muted background |
| Timestamp | Small, below bubble |
| Read receipts | ✓ sent / ✓✓ delivered / ✓✓ blue read |
| Long-press / right-click | Context menu: Reply, Edit (own), Delete (own), Copy |
| Reply-quote | Original message quoted above reply bubble |
| Edited label | "(edited)" in small text after timestamp |
| Deleted message | Bubble replaced with "Message deleted" in italic |
| Image message | Inline image, tap to expand fullscreen |
| Date separator | Centered "Today" / "Yesterday" / "Aug 10, 2026" |

## Issues to Investigate

- [ ] Does the chat room scroll to bottom on new message?
- [ ] Is scroll position preserved when going back and returning?
- [ ] Does typing indicator appear/disappear correctly?
- [ ] Are messages loaded oldest-first with infinite scroll UP?
- [ ] Is the input bar pushed above the keyboard on iOS/Android?
- [ ] Does "Enter" send on desktop and create newline on Shift+Enter?
