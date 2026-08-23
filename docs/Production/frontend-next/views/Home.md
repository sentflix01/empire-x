# frontend-next/views/Home.tsx

> The main social feed screen: ranked/chronological post lists, story ring, compose entry, like/save/comment interactions feeding posts API.

## Facts
- Size: ~417 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/posts/${highlightPostId}`
  - `/api/posts`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
