# frontend-next/views/HashtagFeed.tsx

> Feed filtered by a single hashtag pulled from post_hashtags.

## Facts
- Size: ~72 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/hashtags/${encodeURIComponent`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
