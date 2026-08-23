# frontend-next/store/bookmarksSlice.ts

## 1. What is this?

**State store slice.** Bookmarks store: hydrate/toggleSave with prototype-pollution-safe writes (TD-021) and rollback-on-failure.

Size: roughly 127 lines of source.

## 2. Why does it exist?

Bookmarks store: hydrate/toggleSave with prototype-pollution-safe writes (TD-021) and rollback-on-failure.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/saves`
- `/api/saves/toggle`

**Integrations:** zustand

**Source file:** `frontend-next/store/bookmarksSlice.ts`
