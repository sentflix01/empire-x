# Currency, Commission & Seller Payouts — Canonical Reference

> **Single source of truth for how money works in Nodbusiness.**
> Legal documents (`legal/SELLER_AGREEMENT.md`, `legal/TERMS_OF_SERVICE.md`), product docs
> (`product/SELLER_HANDBOOK.md`, `product/NORTH_STAR.md`), and finance docs must match this
> page. Where any document disagrees with this one, this one wins until an ADR changes it.
> Last updated: 2026-08-23 · Owner: Engineering + Finance

> **Superseded in part (2026-10-16)** by
> [platform model decisions](../decisions/platform-model-decisions.md): NodBusiness never holds
> buyer money. Buyers pay sellers directly, revenue is subscriptions only, no sales commission is
> collected (partnership commissions are recorded only), and the wallet is withdraw-only for
> existing balances. Where this page describes platform checkout, commission collection, top-ups
> or seller payouts from platform funds, the decision record wins.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| ETB | Ethiopian Birr — ledger currency |
| FX | Foreign Exchange |
| KYC | Know Your Customer |
| AML | Anti-Money Laundering |

---

## 1. Currency model (decision)

| Concern | Decision |
|---------|----------|
| **Ledger currency** | **ETB only.** Every `total_price`, wallet balance, commission, and top-up is stored and settled in ETB. |
| **Stripe charging** | Stripe cannot settle ETB on most accounts, so checkout charges are **converted USD = ETB × `STRIPE_ETB_TO_USD_RATE`** (env, default `0.008`). A "Rounding adjustment" line item absorbs sub-cent drift so the charged amount exactly matches the ETB order total at the configured rate. |
| **Chapa** | Native ETB. No conversion. Primary rail for Ethiopian cards/telebirr. |
| **Display** | Buyers see ETB everywhere today. Multi-currency display is a roadmap item behind localization work — it never changes the stored amount. |

**Status:** implemented exactly as described in `backend/routes/orders.ts` and
`backend/routes/wallet.ts`. Any PR touching money must keep this invariant: *one ledger currency,
conversion only at the Stripe charge boundary.*

## 2. Platform commission (decision)

| Parameter | Value |
|-----------|-------|
| Rate | **Flat 3% of order total**, applied when an order is marked `completed` |
| Config | `COMMISSION_RATE` env var (decimal, e.g. `0.03`) — change requires Finance sign-off |
| Collection | Debited from the **seller's in-app wallet** atomically at completion (`backend/routes/commission.ts`); if the balance is insufficient the commission is recorded unpaid and retried on next attempt |
| Tiered rates (6/5/4%) | **Planned, not active.** Do not publish tier tables until shipped here first. |

## 3. Seller payouts (current reality — do not overpromise)

| Step | Status |
|------|--------|
| Buyer pays → platform receives funds | ✅ Live (Stripe / Chapa) |
| Order marked paid, stock decremented, commission recorded | ✅ Live |
| **Automatic credit of net proceeds to seller wallet** | ❌ Not built — roadmap |
| Withdrawals to bank | ⚠️ Exists as an admin-reviewed request flow (`POST /api/wallet/withdraw`); no automated payout rail yet |
| Payout holds / new-seller limits / trust tiers | ❌ Planned (`trust-safety/FRAUD_PREVENTION.md`) |

> **Contract rule:** no public-facing document may promise a payout timeframe (e.g.
> "within 48 hours") until the automatic credit step ships. Until then, seller agreements must
> describe payouts as "processed by Nodbusiness after order completion" without a hard SLA.

## 4. Wallet rules

- Single-currency ETB balances (`wallets.balance`).
- All balance movements go through `atomicWalletOp` (SELECT … FOR UPDATE inside a transaction) — no direct balance writes elsewhere.
- Production restrictions: self-service top-up is admin-only in production; debits/refunds admin-only.
- Chapa/Stripe top-ups use a two-phase `pending_topup → credit` claim that is concurrency-safe.

## 5. Compliance hooks that depend on this page

- AML thresholds are denominated in **ETB**; any future sanctions/KYC vendor integration must convert using the same rate config, not hardcoded USD figures. See `compliance/AML_KYC_POLICY.md`.
- Financial reporting treats gross volume (GMV), commission revenue, and refunds separately; definitions live in `finance/FINANCIAL_MODEL.md`.

## 6. Change process

Changing anything in §1–§4 requires:
1. An ADR in `architecture/ADR.md`,
2. A code PR with migration-safe defaults,
3. Same-day updates to: SELLER_AGREEMENT §6–7, SELLER_HANDBOOK fees section, NORTH_STAR take-rate metric, FINANCIAL_MODEL revenue lines.
