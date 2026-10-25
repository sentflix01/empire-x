# backend/routes/profilePartnerships.ts

## 1. What is this?

An authenticated API for time-limited partnerships between a merchant and a profile owner, plus public display of accepted storefronts.

## 2. Why does it exist?

It lets a merchant offer products or services through another person's profile with clear consent, an agreed commission rate, and an expiry date. The profile owner can accept, decline, or end the deal.

## 3. What does it do?


### Endpoints (10)

| Method | Path | Auth | Line |
|---|---|---|---|
| `GET` | `/api/profile-partnerships/mine` | auth | 61 |
| `GET` | `/api/profile-partnerships/business/:businessId/products` | auth | 74 |
| `GET` | `/api/profile-partnerships/profile/:userId` | optional | 91 |
| `POST` | `/api/profile-partnerships/` | auth | 119 |
| `PUT` | `/api/profile-partnerships/:id/accept` | auth | 165 |
| `PUT` | `/api/profile-partnerships/:id/decline` | auth | 175 |
| `PUT` | `/api/profile-partnerships/:id/terminate` | auth | 185 |
| `GET` | `/api/profile-partnerships/my-commissions` | auth | 195 |
| `GET` | `/api/profile-partnerships/payouts` | auth | 225 |
| `POST` | `/api/profile-partnerships/:id/payouts` | auth | 247 |

## 4. What does it touch?

Uses `profile_partnerships`, `profile_partnership_products`, `profile_owner_commissions`, `orders`, `products`, `businesses`, `user_profiles`, `users`, and `notifications`. Order integration lives in `backend/routes/orders.ts`; schema is added by migration 45. Commission settlement is currently tracked for manual payment outside the app; no wallet withdrawal or payment-provider transfer is implemented.

**Source:** `backend/routes/profilePartnerships.ts`
