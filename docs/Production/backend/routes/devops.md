# backend/routes/devops.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Developer Operations hub: devops_items board CRUD (column-allowlisted), error_events live feed + resolve action, client error intake endpoint (rate-limited), version board persisted in app_settings.

## 3. What does it do?


### Endpoints (18)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/devops/` | admin | 14 |
| `POST` | `/api/devops/` | admin | 21 |
| `PUT` | `/api/devops/:id` | admin | 38 |
| `DELETE` | `/api/devops/:id` | admin | 57 |
| `GET` | `/api/devops/errors` | admin | 74 |
| `GET` | `/api/devops/errors/stats` | admin | 102 |
| `PATCH` | `/api/devops/errors/:id/resolve` | admin | 135 |
| `PUT` | `/api/devops/errors/:id/resolve` | admin | 136 |
| `PATCH` | `/api/devops/errors/resolve-all` | admin | 138 |
| `POST` | `/api/devops/errors/:id/to-ticket` | admin | 154 |
| `POST` | `/api/devops/errors/report` | optional | 193 |
| `GET` | `/api/devops/versions` | admin | 209 |
| `PUT` | `/api/devops/versions` | admin | 216 |
| `PUT` | `/api/devops/versions/:version` | admin | 229 |
| `GET` | `/api/devops/health-summary` | admin | 252 |
| `GET` | `/api/devops/telemetry` | admin | 287 |
| `POST` | `/api/devops/copilot` | admin | 426 |
| `GET` | `/api/devops/scorecard` | admin | 449 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
