# backend/routes/ai.ts - AI endpoints: product description generation and AI chat assistant, gated by feature flags, delegating to lib/ai providers.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/ai/status` | public | 11 |
| `POST` | `/api/ai/generate` | auth | 15 |
| `POST` | `/api/ai/chat` | auth | 31 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

