# frontend-next/views/NearbyMap.tsx

## 1. What is this?

**Screen component (view layer).** Map discovery (Leaflet): nearby products/businesses/tasks markers with clustering and profile-peek popovers.

Size: roughly 580 lines of source.

## 2. Why does it exist?

Map discovery (Leaflet): nearby products/businesses/tasks markers with clustering and profile-peek popovers.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/client`
- `/api/entities`
- `/api/maps/nearby/tasks`
- `/api/maps/nearby/products`

**Integrations:** AuthContext (useAuth)

**Source file:** `frontend-next/views/NearbyMap`
