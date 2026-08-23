# frontend-next/views/CourseDetail.tsx

> Course sales page: curriculum outline, instructor card, enrollment action.

## Facts
- Size: ~153 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/courses/${id}/enrolled`
  - `/api/courses/${id}/enroll`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
