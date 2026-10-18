# backend/routes/profiles.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

User profile system: fetch/upsert profile rows, follow/unfollow toggle inside a transaction keeping follower counters consistent, followers/following lists, social link fields, ticker text/status.

## 3. What does it do?


### Endpoints (11)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/profiles/me` | auth | 129 |
| `GET` | `/api/profiles/by-user/:userId` | optional | 137 |
| `GET` | `/api/profiles/me/follows` | auth | 151 |
| `GET` | `/api/profiles/follows` | auth | 158 |
| `GET` | `/api/profiles/:id` | optional | 165 |
| `GET` | `/api/profiles/` | optional | 184 |
| `POST` | `/api/profiles/` | auth | 227 |
| `PUT` | `/api/profiles/me/upsert` | auth | 244 |
| `PUT` | `/api/profiles/:id` | auth | 264 |
| `PATCH` | `/api/profiles/me/ticker` | auth | 282 |
| `POST` | `/api/profiles/follow/:targetUserId` | auth | 308 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
