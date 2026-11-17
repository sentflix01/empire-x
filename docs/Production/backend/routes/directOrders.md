# backend/routes/directOrders

<!-- AUTO-STUB  2026-10-16 — curate narrative below -->

## 1. What is this?

**Express API route module.** Newly added module — narrative pending curation.

Size: roughly 412 lines of source.

## 2. Why does it exist?

Newly introduced as part of recent development; see source and git history for the introducing commit.

## 3. What does it do?


### Endpoints (13)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/direct-orders/checkout-info` | optional | 150 |
| `POST` | `/api/direct-orders/requests` | optional | 244 |
| `POST` | `/api/direct-orders/bookings` | optional | 323 |
| `POST` | `/api/direct-orders/` | optional | 403 |
| `GET` | `/api/direct-orders/link/:token` | public | 515 |
| `POST` | `/api/direct-orders/link/:token/report-payment` | public | 550 |
| `POST` | `/api/direct-orders/:id/report-payment` | auth | 558 |
| `POST` | `/api/direct-orders/:id/confirm-payment` | auth | 568 |
| `POST` | `/api/direct-orders/:id/reject-payment` | auth | 585 |
| `POST` | `/api/direct-orders/:id/set-price` | auth | 604 |
| `POST` | `/api/direct-orders/:id/decline-request` | auth | 633 |
| `GET` | `/api/direct-orders/link/:token/receipt` | public | 657 |
| `GET` | `/api/direct-orders/:id/receipt` | auth | 665 |

## 4. What does it touch?

**Source:** `backend/routes/directOrders.ts`
