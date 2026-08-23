# backend/routes/search.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Global search: keyword queries across products/posts/users/businesses using FTS vectors where available plus ILIKE fallback; geo distance search variant using Haversine SQL.

## 3. What does it do?


### Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/search/` | optional | 45 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
