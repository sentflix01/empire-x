# backend/routes/devops.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Developer Operations hub: devops_items board CRUD (column-allowlisted), error_events live feed + resolve action, client error intake endpoint (rate-limited), version board persisted in app_settings.

## 3. What does it do?


### Endpoints (12)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/devops/` | admin | 12 |
| `POST` | `/api/devops/` | admin | 19 |
| `PUT` | `/api/devops/:id` | admin | 36 |
| `DELETE` | `/api/devops/:id` | admin | 55 |
| `GET` | `/api/devops/errors` | admin | 64 |
| `PUT` | `/api/devops/errors/:id/resolve` | admin | 79 |
| `POST` | `/api/devops/errors/report` | optional | 92 |
| `GET` | `/api/devops/versions` | public | 107 |
| `PUT` | `/api/devops/versions` | admin | 114 |
| `GET` | `/api/devops/health-summary` | admin | 129 |
| `GET` | `/api/devops/telemetry` | admin | 164 |
| `POST` | `/api/devops/copilot` | admin | 303 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
