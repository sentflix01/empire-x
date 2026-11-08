# backend/routes/devops.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Developer Operations hub: devops_items board CRUD (column-allowlisted), error_events live feed + resolve action, client error intake endpoint (rate-limited), version board persisted in app_settings.

## 3. What does it do?


### Endpoints (20)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/devops/` | admin | 15 |
| `POST` | `/api/devops/` | admin | 22 |
| `PUT` | `/api/devops/:id` | admin | 39 |
| `DELETE` | `/api/devops/:id` | admin | 58 |
| `GET` | `/api/devops/errors` | admin | 75 |
| `GET` | `/api/devops/errors/stats` | admin | 103 |
| `PATCH` | `/api/devops/errors/:id/resolve` | admin | 136 |
| `PUT` | `/api/devops/errors/:id/resolve` | admin | 137 |
| `PATCH` | `/api/devops/errors/resolve-all` | admin | 139 |
| `POST` | `/api/devops/errors/:id/to-ticket` | admin | 155 |
| `POST` | `/api/devops/errors/report` | optional | 194 |
| `GET` | `/api/devops/versions` | admin | 210 |
| `PUT` | `/api/devops/versions` | admin | 217 |
| `PUT` | `/api/devops/versions/:version` | admin | 230 |
| `GET` | `/api/devops/health-summary` | admin | 253 |
| `GET` | `/api/devops/telemetry` | admin | 288 |
| `POST` | `/api/devops/copilot` | admin | 427 |
| `GET` | `/api/devops/scorecard` | admin | 450 |

- Error triage (audit F-006): `GET /errors` takes `resolved`, `level`, `since` (ISO time), `limit` (max 200) and `offset`, and returns the resolver's name and any linked ticket; `GET /errors/stats` returns the header counts; `PATCH /errors/resolve-all` takes an optional `{ level }` and returns `{ resolved }`; `POST /errors/:id/to-ticket` creates one bug ticket per error (a second call returns the same ticket).
- `PUT /versions/:version` saves one version status (`not_started`, `in_progress`, `completed`, `paused`) and keeps the others.
- Non-UUID `:id` values fall through to 404 (`uuidParams`).

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
