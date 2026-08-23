# frontend-next/views/Messages.tsx

## 1. What is this?

**Screen component (view layer).** Conversation inbox listing chats with unread badges; opens ChatRoom for a selected conversation.

Size: roughly 508 lines of source.

## 2. Why does it exist?

Conversation inbox listing chats with unread badges; opens ChatRoom for a selected conversation.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/notifications`
- `/api/messages/presence/${uid}`

**Integrations:** AuthContext (useAuth), Socket.IO

**Source file:** `frontend-next/views/Messages`
