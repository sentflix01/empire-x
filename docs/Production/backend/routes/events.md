# backend/routes/events.ts

## 1. What is this?

**Express API route module.** Auto-built endpoint table from backend/api-catalog.json (regenerate via `npm run docs:api`); narrative curated.

## 2. Why does it exist?

Event listings: create/manage events, ticket types, purchase/RSVP flows writing event_tickets, attendee lists.

## 3. What does it do?


### Endpoints (7)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/events/` | optional | 9 |
| `GET` | `/api/events/:id` | optional | 16 |
| `POST` | `/api/events/` | auth | 24 |
| `PUT` | `/api/events/:id` | auth | 33 |
| `DELETE` | `/api/events/:id` | auth | 44 |
| `POST` | `/api/events/:id/book` | auth | 54 |
| `GET` | `/api/events/:id/attendees` | optional | 86 |

## 4. What does it touch?

**Notes:**
- All handlers follow the standard contract (see ../index.md): auth -> validation -> ownership -> consistent errors.
- Full request/response conventions: docs/backend/API.md; machine catalog: backend/api-catalog.json.

**Machine catalog:** `backend/api-catalog.json` (regenerate: `npm run docs:api`).

**Contract:** follows the standard handler pipeline — see `../index.md`.
