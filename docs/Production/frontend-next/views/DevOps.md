# frontend-next/views/DevOps.tsx

## 1. What is this?

**Screen component (view layer).** Developer operations console: bugs/features board, live error feed polling, version board, docs library search.

Size: roughly 2153 lines of source.

## 2. Why does it exist?

Developer operations console: bugs/features board, live error feed polling, version board, docs library search.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/docs`
- `/api/docs/library`
- `/api/docs/search`
- `/api/docs/strategy/versions`
- `/api/docs/implementation`
- `/api/docs/notes`
- `/api/docs/progress`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/DevOps`
