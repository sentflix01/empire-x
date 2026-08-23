# backend/routes/profiles.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

User profile system: fetch/upsert profile rows, follow/unfollow toggle inside a transaction keeping follower counters consistent, followers/following lists, social link fields, ticker text/status.

## 3. What does it do?

### Endpoints

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/profiles/me` | auth | 30 |
| `GET` | `/api/profiles/by-user/:userId` | optional | 38 |
| `GET` | `/api/profiles/me/follows` | auth | 49 |
| `GET` | `/api/profiles/follows` | auth | 56 |
| `GET` | `/api/profiles/:id` | optional | 63 |
| `GET` | `/api/profiles/` | optional | 74 |
| `POST` | `/api/profiles/` | auth | 106 |
| `PUT` | `/api/profiles/me/upsert` | auth | 119 |
| `PUT` | `/api/profiles/:id` | auth | 137 |
| `PATCH` | `/api/profiles/me/ticker` | auth | 151 |
| `POST` | `/api/profiles/follow/:targetUserId` | auth | 177 |


## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
