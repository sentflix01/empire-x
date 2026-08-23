# frontend-next/components/showroom/ExternalDataSourcePanel.tsx

> Tenant UI to register/edit an external HTTPS source: URL, auth mode, credential (vaulted server-side), TTL.

## Facts
- Size: ~492 lines
- API endpoints touched:
  - `/api/showrooms/${showroomId}/external-sources`

## Notes
- Client-side module; auth handled globally by api/client interceptors.
