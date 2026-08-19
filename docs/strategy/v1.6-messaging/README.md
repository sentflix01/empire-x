# v1.6 — Messaging

> **Theme:** Real-time Communication
> **Goal:** Messaging on Nodbusiness feels as fast and reliable as WhatsApp. Every message delivers instantly, presence is accurate, and the UI handles all message states cleanly.

---

## Scope

| Section | File |
|---------|------|
| Conversation list | [audit.md](./conversation-list/audit.md) · [tasks.md](./conversation-list/tasks.md) |
| Chat room UX | [audit.md](./chat-room/audit.md) · [tasks.md](./chat-room/tasks.md) |
| Message states | [audit.md](./message-states/audit.md) · [tasks.md](./message-states/tasks.md) |
| Group chats & channels | [audit.md](./groups-channels/audit.md) · [tasks.md](./groups-channels/tasks.md) |
| Media & file sharing | [audit.md](./media-sharing/audit.md) · [tasks.md](./media-sharing/tasks.md) |
| Presence & typing | [audit.md](./presence-typing/audit.md) · [tasks.md](./presence-typing/tasks.md) |
| Message actions | [audit.md](./message-actions/audit.md) · [tasks.md](./message-actions/tasks.md) |

---

## Success Criteria

- [ ] Conversation list sorted by `last_message_at` DESC, updates in real-time
- [ ] Unread badge count shows on conversation list item and nav icon
- [ ] Messages deliver in < 500ms on good connection (Socket.IO)
- [ ] Sent → Delivered → Read receipt states shown per message (✓ → ✓✓ → blue ✓✓)
- [ ] Typing indicator appears within 300ms of other user typing
- [ ] Online/offline presence shown on conversation header
- [ ] Last seen shown when user is offline ("Last seen 2 hours ago")
- [ ] Message edit shows "(edited)" label
- [ ] Message delete removes content but keeps bubble with "Message deleted"
- [ ] Reply-quote shows original message above reply
- [ ] Image messages render inline with tap-to-expand
- [ ] Group chats show participant names, admin badge
- [ ] Channels are read-only for non-admins
- [ ] Block system prevents messaging blocked users
- [ ] New message from unknown user shows accept/decline option

---

## Dependencies

- Backend: messages, conversations routes (exist), Socket.IO events (exist)
- Frontend: socket.io-client connected in ChatRoom component
- Backend: read receipts (may need schema addition)
