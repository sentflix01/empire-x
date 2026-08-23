# frontend-next/views/Onboarding.tsx

## 1. What is this?

**Screen component (view layer).** Post-registration wizard collecting profile basics and interests before entering the app.

Size: roughly 267 lines of source.

## 2. Why does it exist?

Post-registration wizard collecting profile basics and interests before entering the app.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`

**Integrations:** AuthContext (useAuth), zustand stores

**Source file:** `frontend-next/views/Onboarding`
