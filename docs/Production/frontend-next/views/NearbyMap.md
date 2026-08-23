# frontend-next/views/NearbyMap.tsx

> Map discovery (Leaflet): nearby products/businesses/tasks markers with clustering and profile-peek popovers.

## Facts
- Size: ~580 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/client`
  - `/api/entities`
  - `/api/maps/nearby/tasks`
  - `/api/maps/nearby/products`
- State / realtime: AuthContext (useAuth)

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
