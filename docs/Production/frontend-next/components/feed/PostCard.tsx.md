# frontend-next/components/feed/PostCard.tsx

## 1. What is this?

**React component.** Feed post card: author row, content/media, poll rendering, like/comment/save actions.

Size: roughly 773 lines of source.

## 2. Why does it exist?

Feed post card: author row, content/media, poll rendering, like/comment/save actions.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/auth`
- `/api/polls/${post.id}/vote`
- `/api/posts/${post.id}/like`
- `/api/posts/${post.id}/comments/${commentId}`

**Integrations:** zustand

**Source file:** `frontend-next/components/feed/PostCard.tsx`
