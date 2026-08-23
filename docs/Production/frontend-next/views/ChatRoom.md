# frontend-next/views/ChatRoom.tsx

## 1. What is this?

**Screen component (view layer).** Real-time chat room over Socket.IO: message stream, typing/presence indicators, pinned/saved messages, media sharing.

Size: roughly 1057 lines of source.

## 2. Why does it exist?

Real-time chat room over Socket.IO: message stream, typing/presence indicators, pinned/saved messages, media sharing.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/messages/conversations/${convId}/messages`
- `/api/messages/conversations/${convId}`
- `/api/messages/block/${otherUserId}`
- `/api/messages/presence/${otherUserId}`
- `/api/profiles`
- `/api/messages/${editingMsg.id}`
- `/api/messages/${msg.id}`

**Integrations:** AuthContext (useAuth), Socket.IO

**Source file:** `frontend-next/views/ChatRoom`
