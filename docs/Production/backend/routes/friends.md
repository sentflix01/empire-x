# backend/routes/friends.ts - Friend graph operations: friend request send/accept/reject, friend list retrieval distinct from passive follows.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (1)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/friends/mutual` | auth | 8 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

