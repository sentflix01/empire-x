# Account deletion and data export

**Decided:** 2026-10-15 by the product owner. **Implemented in:** `backend/lib/accountData.ts`, `backend/routes/auth.ts` (`GET /api/auth/me/export`, `DELETE /api/auth/me`), `backend/db/migrate54.js`, `frontend-next/views/PrivacyAndSecurity.tsx`.

## Context

The Service Agreement promises users the right to delete their account and export their data. The Settings buttons existed, but `DELETE /api/auth/me` did not exist and "Export" returned only the account row.

## Decision: anonymize, keep financial records

Deleting an account **anonymizes** it instead of removing the `users` row. Orders, wallets, wallet transactions, commissions and partnership payouts reference the user; they are kept for accounting, tax and disputes, without the person's identity.

| Data | What happens |
|---|---|
| Profile, posts, comments, likes, stories, follows, blocks, saves, wishlists, cart, notifications, push subscriptions, poll votes, verification requests, points, live location, messages sent, conversation membership | Deleted |
| Reviews | Deleted; ratings of the affected products are recalculated |
| Products, showrooms, coupons | Unlisted (`draft` / `archived` / inactive), not deleted, because past orders point at them |
| Business contact email, phone and address | Cleared |
| Active or pending profile partnerships | Set to `terminated` |
| Orders where the user is the buyer | Kept; `buyer_name`, `buyer_phone`, `buyer_email`, `delivery_address`, `notes` cleared |
| Wallet and wallet transactions, commissions, payouts | Kept unchanged |
| `users` row | Email becomes `deleted-<id>@deleted.invalid`; name, password hash, OAuth id, OTP/reset tokens, referral code and Telegram id cleared; `is_banned = TRUE`, `ban_reason = 'account_deleted'`, `deleted_at` set |

## Guards

- The request must include `confirm: "DELETE"`. Accounts with a password must also send it; Google-only accounts confirm by typing only.
- Refused while the wallet balance is above zero (`WALLET_BALANCE`) or any order as buyer or seller is not `completed`, `cancelled`, `refunded` or `payment_failed` (`OPEN_ORDERS`).
- The last admin cannot be deleted. Demo accounts are refused (they expire with their session).
- After deletion the user cache is invalidated, sessions are revoked (when Redis is available), sockets are disconnected and the refresh cookie is cleared. The banned flag makes the auth middleware reject any token still held.

## Export

`GET /api/auth/me/export` returns JSON with the account (no password hash, OTP or tokens), profile, content, orders as buyer or seller, reviews, messages sent, businesses, showrooms, products, coupons, partnerships, return requests, wallet and wallet transactions, served as a download.

## Not done

- No scheduled hard purge after the 7-year order retention; that needs a separate retention job.
- Messages other people sent to the deleted user stay in their conversations.
