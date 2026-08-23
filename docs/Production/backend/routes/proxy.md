# backend/routes/proxy.ts - PATENT 4 surface B: public render endpoint GET /api/proxy/:showroomId/:sectionKey running the secured gateway (SSRF validation, redirect rejection, quota, TTL cache, stale fallback with X-Stale, health records).

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/proxy/:showroomId/:sectionKey` | public | 16 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

