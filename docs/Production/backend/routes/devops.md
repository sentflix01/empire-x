# backend/routes/devops.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Developer Operations hub: devops_items board CRUD (column-allowlisted), error_events live feed + resolve action, client error intake endpoint (rate-limited), version board persisted in app_settings.

## 3. What does it do?


### Endpoints (15)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/devops/` | admin | 13 |
| `POST` | `/api/devops/` | admin | 20 |
| `PUT` | `/api/devops/:id` | admin | 37 |
| `DELETE` | `/api/devops/:id` | admin | 56 |
| `GET` | `/api/devops/errors` | admin | 65 |
| `PUT` | `/api/devops/errors/:id/resolve` | admin | 80 |
| `POST` | `/api/devops/errors/report` | optional | 93 |
| `GET` | `/api/devops/versions` | public | 108 |
| `PUT` | `/api/devops/versions` | admin | 115 |
| `GET` | `/api/devops/health-summary` | admin | 130 |
| `GET` | `/api/devops/telemetry` | admin | 165 |
| `POST` | `/api/devops/copilot` | admin | 304 |
| `GET` | `/api/devops/scorecard` | admin | 327 |
| `GET` | `/api/devops/log-report` | admin | 339 |
| `GET` | `/api/devops/log-report/:file` | admin | 358 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
