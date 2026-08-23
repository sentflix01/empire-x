# backend/routes/events.ts - Event listings: create/manage events, ticket types, purchase/RSVP flows writing event_tickets, attendee lists.

> Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## Endpoints (7)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/events/` | optional | 9 |
| `GET` | `/api/events/:id` | optional | 16 |
| `POST` | `/api/events/` | auth | 24 |
| `PUT` | `/api/events/:id` | auth | 32 |
| `DELETE` | `/api/events/:id` | auth | 41 |
| `POST` | `/api/events/:id/book` | auth | 51 |
| `GET` | `/api/events/:id/attendees` | optional | 69 |

## Notes
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

