# frontend-next/views/ProductCreate.tsx

## 1. What is this?

**Screen component (view layer).** Seller product authoring form: images via ImageUpload, pricing, category taxonomy, stock, variants entry.

Size: roughly 178 lines of source.

## 2. Why does it exist?

Seller product authoring form: images via ImageUpload, pricing, category taxonomy, stock, variants entry.

## 3. What does it do?

Implements the behavior described above as an interactive client-side module:
data flows through `api/client.ts` (silent token refresh), errors surface via
sonner toasts, and auth failures are handled globally by interceptors.

## 4. What does it touch?

**API endpoints:**
- `/api/entities`
- `/api/client`
- `/api/ai/generate-description`

**Integrations:** AuthContext (useAuth), zustand stores

**Source file:** `frontend-next/views/ProductCreate`
