# Wallet Dashboard — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Balance Card

- [ ] Balance displayed in large text: `ETB 12,500.00` (formatted with `toLocaleString`)
- [ ] Gradient background card (primary blue → accent purple)
- [ ] Balance updates in real-time via WebSocket event `wallet_updated`
  - Or: refetch `GET /api/wallet/me` after every order/transaction mutation
- [ ] Balance visible in nav/header at all times (Zustand `walletSlice.balance`)
  - Fetch on login, update via WebSocket or after transactions

---

## Step 2 — Top-Up Flow

- [ ] "Top Up" button → opens modal
- [ ] Amount input with quick-select chips: ETB 100 / 500 / 1,000 / 5,000
- [ ] Payment method selector:
  - Card (Stripe) — always shown
  - Telebirr / CBE (Chapa) — shown when `FF_CHAPA_PAYMENTS` enabled
- [ ] "Pay ETB X" CTA → calls appropriate endpoint
- [ ] Loading state on payment button
- [ ] On success: close modal, show toast "ETB X added to your wallet", balance updates

---

## Step 3 — Withdrawal Flow

- [ ] "Withdraw" button → opens modal with multi-step form
- [ ] Step 1: Amount (min ETB 100, max = current balance)
- [ ] Step 2: Bank details (bank name, account number, account holder name)
  - Or: pre-filled saved bank details with "Use saved" option
- [ ] Step 3: Confirmation — show amount, fee (if any), net amount
- [ ] Submit → `POST /api/wallet/withdraw`
- [ ] Success: "Withdrawal request submitted. Processing in 1–3 business days."
- [ ] Withdrawal status tracked: pending → approved → transferred
- [ ] Pending withdrawals shown in transaction list with "Pending" badge

---

## Step 4 — Transaction History

- [ ] Filter tabs: All / Credits (+) / Debits (−)
- [ ] Transaction item: direction icon + description + amount (colored) + date
- [ ] Amount: `+ETB 500` in green, `−ETB 1,200` in red, always with comma separator
- [ ] Tapping a transaction that has a reference (order/task) → navigates to that item
- [ ] Infinite scroll (20 per page)
- [ ] Empty state: "No transactions yet" with top-up CTA

---

## Step 5 — Points Balance Section

- [ ] Points card below balance card
- [ ] Shows: ⭐ `340 points` + `≈ ETB 34 discount value` (1 point = 0.1 ETB)
- [ ] "How to earn points" expandable info
- [ ] Points history link → shows `point_transactions`

---

## Step 6 — Referral Section

- [ ] Referral card: user's unique code + share button
- [ ] "Share on WhatsApp" generates: "Join Nodbusiness with my code [CODE] and get 20 bonus points! [link]"
- [ ] Points earned from referrals shown in points history
- [ ] Count: "3 friends joined using your code"

---

## Step 7 — Verify

- [ ] Balance updates after completing an order (as buyer and seller)
- [ ] Top-up via Stripe adds to balance after webhook
- [ ] Withdrawal request creates pending transaction
- [ ] Transaction list filters work correctly
- [ ] Points balance reflects actual `user_profiles.points`
- [ ] Referral code share generates correct message
