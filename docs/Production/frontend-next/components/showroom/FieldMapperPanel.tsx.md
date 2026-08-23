# frontend-next/components/showroom/FieldMapperPanel.tsx

> Declarative mapping editor: paste sample response, live per-row resolved values, clickable detected keys, save/delete mappings via API.

## Facts
- Size: ~449 lines
- API endpoints touched:
  - `/api/showrooms/${showroomId}/external-sources/${sourceId}/mappings`
  - `/api/proxy/${showroomId}/${sectionKey}`
  - `/api/showrooms/${showroomId}/external-sources/${sourceId}/mappings/${mappingId}`

## Notes
- Client-side module; auth handled globally by api/client interceptors.
