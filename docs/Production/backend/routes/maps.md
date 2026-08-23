# backend/routes/maps.ts - Map data: nearby products/businesses/tasks within radius via Haversine SQL (no PostGIS), marker clustering payloads, profile peek info.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/maps/nearby` | optional | 25 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

