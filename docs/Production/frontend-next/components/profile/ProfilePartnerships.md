# frontend-next/components/profile/ProfilePartnerships.tsx

## 1. What is this?

A client component that places merchant partner storefronts and the partnership controls on personal profiles.

## 2. Why does it exist?

Merchants can invite a profile owner to promote selected goods or services. The profile owner decides whether to accept, and can see the agreed commission and attributed orders.

## 3. What does it do?

- Lets profile owners review, accept, or decline pending offers and end active agreements.
- Lets a merchant choose one of their businesses, set a commission percentage and end date, then send an offer.
- Displays accepted, current partner storefronts with a clear partnership label, product cards, share link, and purchase action.
- Displays commission ledger entries and earned totals to the profile owner.
- Passes the agreement's share code into checkout so the backend can attribute eligible orders.

The screen states that payout is currently settled by the business outside the app; ledger amounts are not withdrawable wallet funds.

## 4. What does it touch?

Uses `AuthContext`, the partnership API client, existing business selection, `PurchaseModal`, and the profile tabs. Backend routes are documented in `docs/Production/backend/routes/profilePartnerships.md`.

**Source:** `frontend-next/components/profile/ProfilePartnerships.tsx`
