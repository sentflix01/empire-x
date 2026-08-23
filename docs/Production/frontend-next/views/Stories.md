# frontend-next/views/Stories.tsx

> Story viewer overlay: timed progress bars, tap navigation, view receipts.

## Facts
- Size: ~422 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/stories/${prev.userStories`
  - `/api/stories/${group.stories`
  - `/api/stories/${viewing.userStories`
  - `/api/stories/${active.id}/reactions`
  - `/api/stories/${active.id}/comments`
- State / realtime: zustand stores

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
