# frontend-next/views/Messages.tsx

> Conversation inbox listing chats with unread badges; opens ChatRoom for a selected conversation.

## Facts
- Size: ~508 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/notifications`
  - `/api/messages/presence/${uid}`
- State / realtime: AuthContext (useAuth), Socket.IO

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
