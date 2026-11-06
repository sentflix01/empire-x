# frontend-next/views/DevOps.tsx

## 1. What is this?

**Screen component (view layer).** Developer operations console: bugs/features board, live error feed (stats, resolve, bulk resolve, convert to ticket), version board, health, changelog, implementation log, project summary.

Size: roughly 1790 lines of source.

## 2. Why does it exist?

Developer operations console: bugs/features board, live error feed (stats, resolve, bulk resolve, convert to ticket), version board, health, changelog, implementation log, project summary.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:** `/api/devops/*` (admin only; see `docs/Production/backend/routes/devops.md`).

The Knowledge Base tab was removed in audit F-006: it read seven `/api/docs/*` routes that never existed, and the backend image is built from `backend/` only, so the `docs/` folder is not on the server to serve.

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/DevOps`
