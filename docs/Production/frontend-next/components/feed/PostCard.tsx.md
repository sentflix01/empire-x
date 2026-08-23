# frontend-next/components/feed/PostCard.tsx

> Feed post card: author row, content/media, poll rendering, like/comment/save actions.

## Facts
- Size: ~773 lines
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/auth`
  - `/api/polls/${post.id}/vote`
  - `/api/posts/${post.id}/like`
  - `/api/posts/${post.id}/comments/${commentId}`
- Integrations: zustand

## Notes
- Client-side module; auth handled globally by api/client interceptors.
