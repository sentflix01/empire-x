# frontend-next/views/Home.tsx

## 1. What is this?

**Screen component (view layer).** The main social feed screen: ranked/chronological post lists, story ring, compose entry, like/save/comment interactions feeding posts API.

Size: roughly 417 lines of source.

## 2. Why does it exist?

The main social feed screen: ranked/chronological post lists, story ring, compose entry, like/save/comment interactions feeding posts API.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/posts/${highlightPostId}`
- `/api/posts`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/Home`
