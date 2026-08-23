# backend/routes/upload.ts - File intake: authenticated multipart upload through middleware/upload storage chain (Supabase->R2->local) returning provider URL; size/MIME enforced.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/upload/` | auth | 9 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

