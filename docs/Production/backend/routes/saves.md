# backend/routes/saves.ts - Bookmark service powering the bookmarks store: toggle save/unsave for any target type, list saved items for hydration (client store hydrate endpoint).

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/saves/` | auth | 8 |
| `POST` | `/api/saves/toggle` | auth | 20 |
| `GET` | `/api/saves/check/:targetId` | auth | 34 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

