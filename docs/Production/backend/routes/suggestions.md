# backend/routes/suggestions.ts - People-you-may-know: suggestionScore-ranked candidate list excluding existing follows/blocked.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/suggestions/people` | auth | 9 |
| `POST` | `/api/suggestions/dismiss/:targetUserId` | auth | 73 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

