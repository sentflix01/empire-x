# frontend-next/components/GlobalErrorReporter.tsx

> Global window error/unhandledrejection listeners posting to backend error feed; exports reportClientError used by error boundaries.

## Facts
- Size: ~108 lines
- API endpoints touched:
  - `/api/devops/errors/report`
  - `/api/devops/`

## Notes
- Client-side module; auth handled globally by api/client interceptors.
