# frontend-next/views/Notifications.tsx

> Notification center: list, unread grouping, mark-all-read.

## Facts
- Size: ~207 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/notifications`
  - `/api/notifications/${notif.id}/read`
  - `/api/notifications/read-all`
  - `/api/notifications/${id}`
- State / realtime: AuthContext (useAuth), Socket.IO

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
