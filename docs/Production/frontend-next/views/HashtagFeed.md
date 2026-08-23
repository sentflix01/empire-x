# frontend-next/views/HashtagFeed.tsx

## 1. What is this?

**Screen component (view layer).** Feed filtered by a single hashtag pulled from post_hashtags.

Size: roughly 72 lines of source.

## 2. Why does it exist?

Feed filtered by a single hashtag pulled from post_hashtags.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/hashtags/${encodeURIComponent`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/HashtagFeed`
