# backend/routes/polls.ts - Poll interactions on posts: vote once-per-user enforcement, live vote_count tallies returned to feed.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (2)

| Method | Path | Auth | Line |
|---|---|---|---|
| `POST` | `/api/polls/:postId/vote` | auth | 8 |
| `GET` | `/api/polls/:postId/results` | optional | 43 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

