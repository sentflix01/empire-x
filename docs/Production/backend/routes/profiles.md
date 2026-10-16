# backend/routes/profiles.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

User profile system: fetch/upsert profile rows, follow/unfollow toggle inside a transaction keeping follower counters consistent, followers/following lists, social link fields, ticker text/status.

## 3. What does it do?


### Endpoints (11)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/profiles/me` | auth | 131 |
| `GET` | `/api/profiles/by-user/:userId` | optional | 139 |
| `GET` | `/api/profiles/me/follows` | auth | 153 |
| `GET` | `/api/profiles/follows` | auth | 160 |
| `GET` | `/api/profiles/:id` | optional | 167 |
| `GET` | `/api/profiles/` | optional | 186 |
| `POST` | `/api/profiles/` | auth | 229 |
| `PUT` | `/api/profiles/me/upsert` | auth | 246 |
| `PUT` | `/api/profiles/:id` | auth | 266 |
| `PATCH` | `/api/profiles/me/ticker` | auth | 284 |
| `POST` | `/api/profiles/follow/:targetUserId` | auth | 310 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
