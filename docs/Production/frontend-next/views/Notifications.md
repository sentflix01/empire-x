# frontend-next/views/Notifications.tsx

## 1. What is this?

**Screen component (view layer).** Notification center: list, unread grouping, mark-all-read.

Size: roughly 207 lines of source.

## 2. Why does it exist?

Notification center: list, unread grouping, mark-all-read.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/notifications`
- `/api/notifications/${notif.id}/read`
- `/api/notifications/read-all`
- `/api/notifications/${id}`

**Integrations:** AuthContext (useAuth), Socket.IO

**Source file:** `frontend-next/views/Notifications`
