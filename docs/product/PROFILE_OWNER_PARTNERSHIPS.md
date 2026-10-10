# Profile-owner business partnerships

## Scope

A merchant can invite another real user to promote selected active products or services on that user’s profile. The profile owner must accept before the storefront becomes active. This is an opt-in profile-owner commission arrangement; it is separate from Nodbusiness’s platform commission on commerce.

## Agreement and attribution

- The merchant chooses the business, exact offerings, commission percentage (0.01–50%), and an expiry date within one year.
- Only the business owner can create an invitation. A user cannot partner with their own profile, and demo/seed accounts cannot be invited into a real partnership.
- The invited profile owner can accept, decline, or end an active agreement. Either party can end an active agreement.
- An active agreement attributes an eligible purchase only when the buyer uses its share code and the purchased offering is selected in the agreement. The profile owner cannot earn commission on their own purchase.
- Checkout snapshots the agreement, profile owner, agreed rate, and eligible after-discount product subtotal onto the order. Delivery and tax are excluded. Expiry or termination prevents new attributions and does not rewrite an order already attributed.
- A profile-owner commission ledger row is created idempotently when the attributed order is completed. Repeated completion requests retry the idempotent write if an earlier write failed.

## Accounting and settlement

- Platform commissions remain in the existing platform `commissions` ledger. Profile-owner amounts are recorded independently in `profile_owner_commissions` and its adjustment ledger.
- Refunds and Stripe disputes create auditable signed adjustment entries. A dispute that is won restores a previously recorded paid state when payout history proves that the commission was paid.
- The merchant records a payout only after paying the profile owner outside the app. The record stores currency, amount, optional payment reference, payer, recipient, partnership, and included commission rows.
- This record is a reconciliation ledger, not a payment instruction, withdrawable wallet balance, or provider transfer. Nodbusiness does not initiate profile-owner payouts.
- If a refund or dispute reverses commission after a manual payout, the adjustment remains visible against the commission and the original payout record is preserved. The parties must reconcile any overpayment outside the app.

## Re-entry and verification

This workflow is part of the current launch scope. Changes must preserve merchant/profile-owner consent, selected-offering checks, real/demo isolation, order snapshots, idempotent commission recording, refund/dispute adjustments, and immutable payout history. Relevant schema is introduced by migrations 45 and 47. Focused tests live in `backend/test/profilePartnerships.test.js` and `backend/test/stripe.test.js`.
