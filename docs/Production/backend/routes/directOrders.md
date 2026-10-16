# backend/routes/directOrders

<!-- AUTO-STUB  2026-10-16 — curate narrative below -->

## 1. What is this?

**Express API route module.** Newly added module — narrative pending curation.

Size: roughly 412 lines of source.

## 2. Why does it exist?

Newly introduced as part of recent development; see source and git history for the introducing commit.

## 3. What does it do?


### Endpoints (9)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/direct-orders/checkout-info` | optional | 138 |
| `POST` | `/api/direct-orders/` | optional | 169 |
| `GET` | `/api/direct-orders/link/:token` | public | 281 |
| `POST` | `/api/direct-orders/link/:token/report-payment` | public | 316 |
| `POST` | `/api/direct-orders/:id/report-payment` | auth | 324 |
| `POST` | `/api/direct-orders/:id/confirm-payment` | auth | 334 |
| `POST` | `/api/direct-orders/:id/reject-payment` | auth | 351 |
| `GET` | `/api/direct-orders/link/:token/receipt` | public | 375 |
| `GET` | `/api/direct-orders/:id/receipt` | auth | 383 |

## 4. What does it touch?

**Source:** `backend/routes/directOrders.ts`
