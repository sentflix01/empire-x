# frontend-next/views/Stories.tsx

## 1. What is this?

**Screen component (view layer).** Story viewer overlay: timed progress bars, tap navigation, view receipts.

Size: roughly 422 lines of source.

## 2. Why does it exist?

Story viewer overlay: timed progress bars, tap navigation, view receipts.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/stories/${prev.userStories`
- `/api/stories/${group.stories`
- `/api/stories/${viewing.userStories`
- `/api/stories/${active.id}/reactions`
- `/api/stories/${active.id}/comments`

**Integrations:** zustand stores

**Source file:** `frontend-next/views/Stories`
