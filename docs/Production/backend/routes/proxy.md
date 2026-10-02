# backend/routes/proxy.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

PATENT 4 surface B: public render endpoint GET /api/proxy/:showroomId/:sectionKey running the secured gateway (SSRF validation, redirect rejection, quota, TTL cache, stale fallback with X-Stale, health records).

## 3. What does it do?


### Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/proxy/:showroomId/:sectionKey` | optional | 17 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
