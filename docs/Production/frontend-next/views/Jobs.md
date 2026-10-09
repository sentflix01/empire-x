> ⚠️ **HISTORICAL** — corresponding source file was removed from the codebase on 2026-10-08. Kept for reference.

# frontend-next/views/Jobs.tsx

## 1. What is this?

**Screen component (view layer).** Job board listing with search/filter and apply flow.

Size: roughly 124 lines of source.

## 2. Why does it exist?

Job board listing with search/filter and apply flow.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/jobs/${job.id}/apply`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/Jobs`
