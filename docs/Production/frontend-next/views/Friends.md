# frontend-next/views/Friends.tsx

> Friends/following manager: requests, suggestions strip, existing graph.

## Facts
- Size: ~348 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/friends`
  - `/api/suggestions`
  - `/api/profiles/me/follows`
  - `/api/profiles/by-user/${uid}`
  - `/api/profiles/follow/${userId}`

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
