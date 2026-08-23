# frontend-next/views/Friends.tsx

## 1. What is this?

**Screen component (view layer).** Friends/following manager: requests, suggestions strip, existing graph.

Size: roughly 348 lines of source.

## 2. Why does it exist?

Friends/following manager: requests, suggestions strip, existing graph.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/friends`
- `/api/suggestions`
- `/api/profiles/me/follows`
- `/api/profiles/by-user/${uid}`
- `/api/profiles/follow/${userId}`

**Source file:** `frontend-next/views/Friends`
