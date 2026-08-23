# frontend-next/views/ShowroomView.tsx

> Public storefront renderer: composes SectionRenderer sections bound to platform data or external APIs (Patent 4 render surface).

## Facts
- Size: ~298 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/messages/inquiry`
  - `/api/notifications`
  - `/api/showrooms/slug/${slugParam}`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
