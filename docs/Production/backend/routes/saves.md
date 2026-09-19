# backend/routes/saves.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Bookmark service powering the bookmarks store: toggle save/unsave for any target type, list saved items for hydration (client store hydrate endpoint).

## 3. What does it do?


### Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/saves/` | auth | 8 |
| `POST` | `/api/saves/toggle` | auth | 66 |
| `GET` | `/api/saves/check/:targetId` | auth | 80 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
