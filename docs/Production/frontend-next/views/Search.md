# frontend-next/views/Search.tsx

## 1. What is this?

**Screen component (view layer).** Global search results page querying the unified search API across entity types.

Size: roughly 562 lines of source.

## 2. Why does it exist?

Global search results page querying the unified search API across entity types.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/search`

**Source file:** `frontend-next/views/Search`
