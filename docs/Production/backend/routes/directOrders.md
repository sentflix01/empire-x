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
| `GET` | `/api/direct-orders/checkout-info` | optional | 144 |
| `POST` | `/api/direct-orders/requests` | optional | 238 |
| `POST` | `/api/direct-orders/` | optional | 310 |
| `GET` | `/api/direct-orders/link/:token` | public | 422 |
| `POST` | `/api/direct-orders/link/:token/report-payment` | public | 457 |
| `POST` | `/api/direct-orders/:id/report-payment` | auth | 465 |
| `POST` | `/api/direct-orders/:id/confirm-payment` | auth | 475 |
| `POST` | `/api/direct-orders/:id/reject-payment` | auth | 492 |
| `POST` | `/api/direct-orders/:id/set-price` | auth | 511 |
| `POST` | `/api/direct-orders/:id/decline-request` | auth | 540 |
| `GET` | `/api/direct-orders/link/:token/receipt` | public | 564 |
| `GET` | `/api/direct-orders/:id/receipt` | auth | 572 |

## 4. What does it touch?

**Source:** `backend/routes/directOrders.ts`
