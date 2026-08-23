# backend/routes/devops.ts - Developer Operations hub: devops_items board CRUD (column-allowlisted), error_events live feed + resolve action, client error intake endpoint (rate-limited), version board persisted in app_settings.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (9)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/devops/` | admin | 11 |
| `POST` | `/api/devops/` | admin | 18 |
| `PUT` | `/api/devops/:id` | admin | 35 |
| `DELETE` | `/api/devops/:id` | admin | 54 |
| `GET` | `/api/devops/errors` | admin | 63 |
| `PUT` | `/api/devops/errors/:id/resolve` | admin | 78 |
| `POST` | `/api/devops/errors/report` | optional | 91 |
| `GET` | `/api/devops/versions` | public | 106 |
| `PUT` | `/api/devops/versions` | admin | 113 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

