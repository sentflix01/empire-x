# backend/routes/directOrders

<!-- AUTO-STUB  2026-10-16 — curate narrative below -->

## 1. What is this?

**Express API route module.** Newly added module — narrative pending curation.

Size: roughly 412 lines of source.

## 2. Why does it exist?

Newly introduced as part of recent development; see source and git history for the introducing commit.

## 3. What does it do?


### Endpoints (12)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/direct-orders/checkout-info` | optional | 143 |
| `POST` | `/api/direct-orders/requests` | optional | 237 |
| `POST` | `/api/direct-orders/` | optional | 309 |
| `GET` | `/api/direct-orders/link/:token` | public | 421 |
| `POST` | `/api/direct-orders/link/:token/report-payment` | public | 456 |
| `POST` | `/api/direct-orders/:id/report-payment` | auth | 464 |
| `POST` | `/api/direct-orders/:id/confirm-payment` | auth | 474 |
| `POST` | `/api/direct-orders/:id/reject-payment` | auth | 491 |
| `POST` | `/api/direct-orders/:id/set-price` | auth | 510 |
| `POST` | `/api/direct-orders/:id/decline-request` | auth | 539 |
| `GET` | `/api/direct-orders/link/:token/receipt` | public | 563 |
| `GET` | `/api/direct-orders/:id/receipt` | auth | 571 |

## 4. What does it touch?

**Source:** `backend/routes/directOrders.ts`
