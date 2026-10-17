# backend/routes/subscriptionsEtb

<!-- AUTO-STUB  2026-10-17 — curate narrative below -->

## 1. What is this?

**Express API route module.** Newly added module — narrative pending curation.

Size: roughly 199 lines of source.

## 2. Why does it exist?

Newly introduced as part of recent development; see source and git history for the introducing commit.

## 3. What does it do?


### Endpoints (9)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/subscriptions/quote` | public | 56 |
| `POST` | `/api/subscriptions/checkout` | public | 65 |
| `POST` | `/api/subscriptions/webhook/chapa` | public | 82 |
| `GET` | `/api/subscriptions/chapa/callback` | public | 105 |
| `GET` | `/api/subscriptions/payments` | public | 127 |
| `GET` | `/api/subscriptions/payments/:ref/status` | public | 137 |
| `GET` | `/api/subscriptions/payments/:id/receipt` | public | 152 |
| `GET` | `/api/subscriptions/chapa/sandbox` | public | 170 |
| `POST` | `/api/subscriptions/chapa/sandbox/pay` | public | 187 |

## 4. What does it touch?

**Source:** `backend/routes/subscriptionsEtb.ts`
