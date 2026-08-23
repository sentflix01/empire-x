# frontend-next/views/ProductCreate.tsx

> Seller product authoring form: images via ImageUpload, pricing, category taxonomy, stock, variants entry.

## Facts
- Size: ~178 lines (view-layer logic; thin page wrapper delegates here)
- API endpoints touched:
  - `/api/entities`
  - `/api/client`
  - `/api/ai/generate-description`
- State / realtime: AuthContext (useAuth), zustand stores

## Notes
- Client component (interactive UI); server data via axios client with silent token refresh.
- Errors surface through sonner toasts; auth failures are handled globally by api/client interceptors.
