# backend/routes/externalSources.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

PATENT 4 surface A: tenants register external HTTPS data sources per showroom section - URL, auth mode, AES-GCM-encrypted credentials (per-tenant HKDF keys), declarative field mappings CRUD. Ownership asserted per showroom.

## 3. What does it do?


### Endpoints (9)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/showrooms/:showroomId/external-sources/health` | public | 103 |
| `GET` | `/api/showrooms/:showroomId/external-sources/` | public | 127 |
| `POST` | `/api/showrooms/:showroomId/external-sources/` | public | 139 |
| `PUT` | `/api/showrooms/:showroomId/external-sources/:sourceId` | public | 162 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId` | public | 187 |
| `GET` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | public | 202 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings` | public | 212 |
| `DELETE` | `/api/showrooms/:showroomId/external-sources/:sourceId/mappings/:mappingId` | public | 228 |
| `POST` | `/api/showrooms/:showroomId/external-sources/:sourceId/refresh` | public | 240 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
