# frontend-next/views/CourseDetail.tsx

## 1. What is this?

**Screen component (view layer).** Course sales page: curriculum outline, instructor card, enrollment action.

Size: roughly 153 lines of source.

## 2. Why does it exist?

Course sales page: curriculum outline, instructor card, enrollment action.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/courses/${id}/enrolled`
- `/api/courses/${id}/enroll`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/CourseDetail`
