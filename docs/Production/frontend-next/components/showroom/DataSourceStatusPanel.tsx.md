# frontend-next/components/showroom/DataSourceStatusPanel.tsx

> Health surface for a section source: last fetch status/latency from external_health_records.

## Facts
- Size: ~246 lines
- API endpoints touched:
  - `/api/showrooms/${showroomId}/external-sources/health`
  - `/api/showrooms/${showroomId}/external-sources/${sourceId}/refresh`

## Notes
- Client-side module; auth handled globally by api/client interceptors.
