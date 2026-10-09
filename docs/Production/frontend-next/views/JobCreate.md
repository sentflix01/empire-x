> ⚠️ **HISTORICAL** — corresponding source file was removed from the codebase on 2026-10-08. Kept for reference.

# frontend-next/views/JobCreate.tsx

## 1. What is this?

**Screen component (view layer).** Employer job posting form: role details, salary, category, application settings.

Size: roughly 95 lines of source.

## 2. Why does it exist?

Employer job posting form: role details, salary, category, application settings.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`

**Integrations:** zustand stores

**Source file:** `frontend-next/views/JobCreate`
