# frontend-next/views/JobCreate.tsx

> Employer job posting form: role details, salary, category, application settings.

## Facts
- Size: ~95 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
- State / realtime: zustand stores

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
