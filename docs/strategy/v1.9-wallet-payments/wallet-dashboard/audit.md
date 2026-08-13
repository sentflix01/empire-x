# Wallet Dashboard — Audit

## Current Architecture

- Route: `/wallet`
- Backend: `GET /api/wallet/me` → `{ balance, currency, transactions[] }`
- Transactions: `wallet_transactions` table
- Top-up: `POST /api/wallet/topup/stripe` or `/topup/chapa`
- Withdraw: `POST /api/wallet/withdraw`

## Dashboard Layout (Global Standard)

```
┌─────────────────────────────┐
│   💰 Your Balance           │  ← Card with gradient bg
│   ETB 12,500.00             │  ← Large balance display
│   [Top Up]  [Withdraw]      │  ← Two action buttons
└─────────────────────────────┘
┌─────────────────────────────┐
│  Points Balance             │  ← Loyalty points card
│  ⭐ 340 points              │
│  = ETB 34 discount value    │
└─────────────────────────────┘
┌─────────────────────────────┐
│  Transactions               │  ← Transaction history
│  [All] [Credits] [Debits]   │  ← Filter tabs
│  ─────────────────────────  │
│  ↑ Task payment  +500 ETB   │
│  ↓ Product order -1,200 ETB │
│  ↑ Wallet top-up +5,000 ETB │
└─────────────────────────────┘
```

## Transaction Item Requirements

| Element | Standard |
|---------|----------|
| Direction icon | ↑ green for credit, ↓ red for debit |
| Description | Human-readable: "Product sale", "Task payment", "Top-up" |
| Amount | Bold, green for +, red for − |
| Date | Relative + absolute on hover |
| Reference | Tappable if linked to an order/task |

## Issues to Investigate

- [ ] Is balance shown in the nav/header in real-time?
- [ ] Are transactions paginated or all loaded at once?
- [ ] Is there a visual balance change animation when balance updates?
- [ ] Is the withdrawal flow complete (form → pending → approved)?
- [ ] Is the points balance integrated in the wallet view?
