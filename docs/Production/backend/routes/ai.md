# backend/routes/ai.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

AI endpoints: product description generation and AI chat assistant, gated by feature flags, delegating to lib/ai providers.

## 3. What does it do?

### Endpoints

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/ai/status` | public | 11 |
| `POST` | `/api/ai/generate` | auth | 15 |
| `POST` | `/api/ai/chat` | auth | 31 |


## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
