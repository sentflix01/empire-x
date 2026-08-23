# frontend-next/views/ChatRoom.tsx

> Real-time chat room over Socket.IO: message stream, typing/presence indicators, pinned/saved messages, media sharing.

## Facts
- Size: ~1057 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/messages/conversations/${convId}/messages`
  - `/api/messages/conversations/${convId}`
  - `/api/messages/block/${otherUserId}`
  - `/api/messages/presence/${otherUserId}`
  - `/api/profiles`
  - `/api/messages/${editingMsg.id}`
  - `/api/messages/${msg.id}`
- State / realtime: AuthContext (useAuth), Socket.IO

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
