# backend/routes/profiles.ts - User profile system: fetch/upsert profile rows, follow/unfollow toggle inside a transaction keeping follower counters consistent, followers/following lists, social link fields, ticker text/status.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (11)

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

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

