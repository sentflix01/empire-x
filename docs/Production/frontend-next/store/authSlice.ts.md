# frontend-next/store/authSlice.ts

## 1. What is this?

**State store slice.** Zustand auth slice mirroring AuthContext hydration via ensureFreshToken.

Size: roughly 71 lines of source.

## 2. Why does it exist?

Zustand auth slice mirroring AuthContext hydration via ensureFreshToken.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/auth/me`
- `/api/auth/logout`

**Integrations:** zustand

**Source file:** `frontend-next/store/authSlice.ts`
