# v1.9 — Wallet & Payments

> **Theme:** Money Flow
> **Goal:** Every financial transaction on Halehame is fast, transparent, and trustworthy. Users always know their balance, where money came from, and where it went.

---

## Scope

| Section | File |
|---------|------|
| Wallet dashboard | [audit.md](./wallet-dashboard/audit.md) · [tasks.md](./wallet-dashboard/tasks.md) |
| Top-up flow | [audit.md](./top-up/audit.md) · [tasks.md](./top-up/tasks.md) |
| Withdrawal flow | [audit.md](./withdrawal/audit.md) · [tasks.md](./withdrawal/tasks.md) |
| Transaction history | [audit.md](./transaction-history/audit.md) · [tasks.md](./transaction-history/tasks.md) |
| Stripe integration | [audit.md](./stripe/audit.md) · [tasks.md](./stripe/tasks.md) |
| Chapa integration | [audit.md](./chapa/audit.md) · [tasks.md](./chapa/tasks.md) |
| Commission system | [audit.md](./commission/audit.md) · [tasks.md](./commission/tasks.md) |
| Referral & points | [audit.md](./referral-points/audit.md) · [tasks.md](./referral-points/tasks.md) |
| Invoice generation | [audit.md](./invoices/audit.md) · [tasks.md](./invoices/tasks.md) |

---

## Success Criteria

- [ ] Wallet balance visible in header/nav at all times (updates in real-time)
- [ ] Transaction history: infinite scroll, filter by type (credit/debit/all), date range
- [ ] Each transaction: icon, description, amount (green/red), date, running balance
- [ ] Top-up via Stripe: amount → payment → instant balance update
- [ ] Top-up via Chapa (Telebirr, CBE): amount → redirect → return → balance update
- [ ] Withdrawal: bank account form → submit → pending → admin approval → done
- [ ] Withdrawal status tracked: pending → approved → transferred
- [ ] Commission deducted automatically on order completion (3% platform fee)
- [ ] Seller sees commission breakdown per order
- [ ] Referral: code sharing page, points balance, history of earned points
- [ ] Points can be redeemed for discounts at checkout
- [ ] PDF invoice downloadable for every completed order
- [ ] All amounts in ETB with optional USD display

---

## Dependencies

- Backend: wallet, orders/webhook, commission, referral routes (all exist)
- Frontend: Stripe.js (configured), Chapa redirect flow
- Admin: withdrawal approval interface
