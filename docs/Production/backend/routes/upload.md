# backend/routes/upload.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

File intake: authenticated multipart upload through middleware/upload. Real uploads return public provider URLs; Demo uploads use the verified private Supabase bucket and return temporary signed URLs. Demo R2 uploads fail closed. Size, MIME, and image/PDF magic bytes are enforced.

## 3. What does it do?


### Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/upload/` | auth | 10 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
