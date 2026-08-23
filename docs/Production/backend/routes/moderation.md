# backend/routes/moderation.ts - Trust-and-safety primitives: report content/user, blocklist management, admin moderation queue actions.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/moderation/report` | auth | 8 |
| `GET` | `/api/moderation/reports` | admin | 26 |
| `PUT` | `/api/moderation/reports/:id` | admin | 42 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

