# backend/routes/push.ts - Web Push: stores browser push_subscriptions, dispatches sendPushToUser used by order/payment/social events.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (3)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/push/vapid-public-key` | public | 52 |
| `POST` | `/api/push/subscribe` | auth | 57 |
| `DELETE` | `/api/push/unsubscribe` | auth | 72 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

