# Nodbusiness — Payment Integration Guide

> Complete technical reference for Stripe and Chapa payment integrations.
> Reference market: Ethiopia (Chapa/ETB). Global default: Stripe/USD.
> Last updated: August 2026

> **Changed 2026-10-16** ([platform model decisions](../decisions/platform-model-decisions.md)):
> order checkout through Stripe or Chapa and wallet top-ups are retired and return
> `410 PLATFORM_COLLECTION_RETIRED`. Buyers pay sellers directly through `/api/direct-orders`
> (see [API.md](API.md#direct-orders-pay-the-seller-directly)). Stripe and Chapa remain for
> business subscriptions only.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| ETB | Ethiopian Birr — reference market currency |
| USD | United States Dollar |
| COD | Cash on Delivery |
| HMAC | Hash-based Message Authentication Code |
| JWT | JSON Web Token |
| KYC | Know Your Customer |
| PCI-DSS | Payment Card Industry Data Security Standard |
| SAQ | Self-Assessment Questionnaire — PCI compliance form |
| SCA | Strong Customer Authentication — EU payment regulation |
| PSD2 | Payment Services Directive 2 — EU open banking regulation |
| URL | Uniform Resource Locator |
| UUID | Universally Unique Identifier |
| DB | Database |
| GMV | Gross Merchandise Value |
| NBE | National Bank of Ethiopia — reference market payment regulator |

---

## Overview

Nodbusiness supports two payment providers:

| Provider | Currency | Use case | Status |
|---|---|---|---|
| **Stripe** | USD (ETB→USD conversion) | International cards, digital wallets | ✅ Live |
| **Chapa** | ETB native | Telebirr, CBE Birr, M-Pesa, all Ethiopian banks | ✅ Live |
| **COD** | ETB (cash) | Cash on delivery fallback | ✅ Live |

---

## Stripe Integration

### Architecture

```
Frontend → POST /api/orders/checkout/session
                    ↓
         Stripe Hosted Checkout
                    ↓
         User completes payment on Stripe
                    ↓
         Stripe redirects to /orders/success?session_id=xxx
                    ↓
         Stripe sends webhook POST /api/orders/webhook
                    ↓
         markStripeOrdersPaid() → updates DB
```

### Key Files
- `backend/routes/orders.js` — checkout session + webhook handler
- `backend/routes/wallet.ts` — wallet top-up via Stripe
- `frontend-next/views/Cart.tsx` — cart checkout flow
- `frontend-next/components/checkout/PurchaseModal.tsx` — single product checkout
- `frontend-next/app/(app)/orders/success/page.tsx` — post-payment confirmation page
- `frontend-next/app/(app)/orders/cancel/page.tsx` — cancelled payment page

### Creating a Checkout Session

```javascript
// POST /api/orders/checkout/session
// Accepts: single product OR multi-item cart
const sessionParams = {
  mode: 'payment',
  line_items: buildCombinedLineItems(chargeCurrency),
  success_url: `${frontendUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}&provider=stripe`,
  cancel_url:  `${frontendUrl}/orders/cancel?provider=stripe`,
  metadata: {
    purpose: 'order',
    buyer_id: req.user.id,
    order_ids: createdOrderIds.join(','),
    seller_ids: [...groups.keys()].join(','),
    coupon_id: couponInfo?.id || '',
  },
};
```

**Important:** `{CHECKOUT_SESSION_ID}` is a Stripe template variable — Stripe replaces it with the actual session ID on redirect.

### Webhook Events Handled

| Event | Action |
|---|---|
| `checkout.session.completed` (payment_status=paid) | Mark orders paid, decrement stock, notify, collect commission |
| `checkout.session.async_payment_succeeded` | Same as above (for deferred payment methods) |
| `checkout.session.expired` | Mark orders as `payment_failed` |
| `payment_intent.payment_failed` | Mark orders as `payment_failed` |
| `charge.refunded` | Mark orders refunded, reverse commission, notify |

### Webhook Security

```javascript
// The raw body must be preserved for signature verification
// This is set BEFORE express.json() in index.ts:
app.use('/api/orders/webhook', express.raw({ type: 'application/json' }));

// Verification in webhook handler:
const event = stripe.webhooks.constructEvent(
  req.body,  // raw Buffer
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### Webhook Idempotency

```javascript
// Every processed event is recorded to prevent double-processing
await pool.query(
  'INSERT INTO webhook_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
  [event.id, event.type]
);
```

### Currency Handling

```javascript
// ETB is not supported by all Stripe accounts
// Fallback chain:
try {
  session = await stripe.checkout.sessions.create(buildParams('etb'));
} catch (err) {
  // ETB rejected → retry in USD
  session = await stripe.checkout.sessions.create(buildParams('usd'));
}

// Conversion rate (configurable):
// STRIPE_ETB_TO_USD_RATE=0.008 (default)
// ETB 1,000 → USD 8.00
```

### Stripe Test Cards

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0025 0000 3155` | 3D Secure authentication |
| `4000 0000 0000 0002` | Generic decline |

Use any future expiry date, any 3-digit CVC, any ZIP code.

### Going Live Checklist

- [ ] Switch `STRIPE_SECRET_KEY` to `sk_live_...`
- [ ] Register webhook endpoint at dashboard.stripe.com → Webhooks
- [ ] Set `STRIPE_WEBHOOK_SECRET` to the live `whsec_...`
- [ ] Test with a real card in live mode (small amount)
- [ ] Enable Stripe Radar fraud protection
- [ ] Set up Stripe tax collection if required

---

## Chapa Integration

### Architecture (pull-based verification — no webhook)

Chapa confirmation is **pull-based**: the backend verifies each transaction server-to-server.
There is no Chapa webhook endpoint — do not register one and do not call one.

```
Frontend → POST /api/orders/checkout/chapa
                    ↓
         Chapa Hosted Checkout (or sandbox page in dev)
                    ↓
         User pays via Telebirr/CBE/etc.
                    ↓
         Chapa calls the registered callback_url:
           GET /api/orders/chapa/verify/:tx_ref   ← server-side verification
                    ↓
         Order marked paid, stock decremented, commission recorded,
         buyer/seller notified; browser redirected to
         /orders/success?tx_ref=…&provider=chapa
```

### Key Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/orders/checkout/chapa` | Initialize Chapa checkout for a product (auth required) |
| `GET /api/orders/chapa/verify/:tx_ref` | Server-to-server verification callback (Chapa `callback_url`). Calls Chapa's verify API, then flips the order `pending → paid` exactly once. |
| `GET /api/orders/chapa/status/:tx_ref` | Read-only order status lookup (DB-only, no upstream Chapa calls). Frontend polls this while the Chapa window is open. |
| `GET /api/orders/chapa/sandbox` | Local sandbox simulation page. **Dev/test only — returns 404 outside sandbox mode or in production.** |
| `GET /api/wallet/topup/chapa/verify/:tx_ref` | Wallet top-up verification (same pull model, transactional claim) |
| `GET /api/wallet/topup/chapa/sandbox` | Wallet sandbox page (same restrictions) |

> ✅ **Resolved (TD-015):** `PurchaseModal.tsx` polls `GET /api/orders/chapa/status/:tx_ref`,
> which now exists as a DB-only read — confirmation still arrives server-side via the verify
> callback, so polling never duplicates upstream verification calls.

### Sandbox Mode

```bash
# Set in backend/.env for local development:
CHAPA_SECRET_KEY=SANDBOX
```

With `SANDBOX` as the key, Chapa calls are intercepted and a local sandbox page is shown instead of the real Chapa checkout. No real money moves. Sandbox pages are hard-disabled in production regardless of configuration.

### Transaction Reference Format

```javascript
// Order payments  (backend/routes/orders.ts)
const tx_ref = `ndb-${req.user.id.slice(0, 8)}-${Date.now()}`;

// Wallet top-ups  (backend/routes/wallet.ts)
const tx_ref = `empx-wallet-${req.user.id.slice(0, 8)}-${Date.now()}`;
```

> Note: unifying these prefixes is cosmetic debt (TD-016); both are unique per user+timestamp.

### Callback Registration

The verify URL is passed per-transaction as `callback_url` during initialize — no dashboard
webhook registration exists or is needed:

```
callback_url = `${API_URL}/api/orders/chapa/verify/${tx_ref}`
return_url   = `${FRONTEND_URL}/orders/success?tx_ref=${tx_ref}&provider=chapa`
```

### Concurrency & amount safety

- The wallet top-up verify claims the `pending_topup` row inside a transaction, so two
  simultaneous callbacks can never double-credit; the credited amount is the server-recorded
  expected amount and underpayments are rejected (`routes/wallet.ts`).
- Order verification flips `pending → paid` with a guarded `UPDATE … WHERE status='pending'`.

---

## Wallet Top-up via Stripe

```javascript
// POST /api/wallet/topup/stripe
// Creates a Stripe checkout session for wallet top-up

const sessionParams = {
  mode: 'payment',
  line_items: [{ price_data: { currency, product_data: { name: 'Nodbusiness Wallet Top-up' }, unit_amount: toCents(cur) }, quantity: 1 }],
  success_url: `${frontendUrl}/wallet?topup=success&provider=stripe`,
  cancel_url:  `${frontendUrl}/wallet?topup=cancelled`,
  metadata: {
    purpose: 'wallet_topup',
    user_id: req.user.id,
    wallet_id: wallet.id,
    amount_etb: String(amountEtb),
  },
  // Critical: payment_intent_data propagates metadata to charge.refunded events
  payment_intent_data: {
    metadata: { purpose: 'wallet_topup', wallet_id: wallet.id, amount_etb: String(amountEtb) }
  },
};
```

### Wallet Refund Flow (charge.refunded)

```javascript
// When a wallet top-up is refunded via Stripe:
if (charge.metadata?.purpose === 'wallet_topup' || charge.metadata?.wallet_id) {
  const walletId = charge.metadata.wallet_id;
  const topupEtb = parseFloat(charge.metadata.amount_etb || '0');
  // Reverse the platform-side credit (proportional to refund amount)
  await pool.query(
    'UPDATE wallets SET balance = GREATEST(balance - $1, 0) WHERE id = $2',
    [reversal, walletId]
  );
}
```

---

## Payment Error Handling

### Stripe 503 (not configured)
```javascript
// Cart.tsx falls back to COD when Stripe returns 503:
if (err?.status && err.status !== 503) {
  toast.error(err?.error || t('cart.checkoutFailed'));
  return; // Real error — don't fall through to COD
}
// 503 = Stripe not set up → fall through to COD gracefully
```

### Partial Cart Failure
```javascript
// If some items fail, remove already-ordered items from cart:
if (placed > 0) {
  for (const id of placedItemIds) {
    try { await removeItem(id); } catch { }
  }
  toast.error(t('cart.partialCheckout', { placed, reason }));
  router.push('/orders');
}
```

### Stripe Session Rollback
```javascript
// If session creation fails, mark orders as payment_failed
if (createdOrderIds.length) {
  pool.query(
    `UPDATE orders SET status = 'payment_failed'
     WHERE id = ANY($1::uuid[]) AND stripe_session_id IS NULL AND status = 'pending'`,
    [createdOrderIds]
  ).catch(() => {});
}
```

---

## Testing Payments Locally

### Stripe
1. Set `STRIPE_SECRET_KEY=sk_test_...` in backend/.env
2. Run `stripe listen --forward-to localhost:3001/api/orders/webhook` (Stripe CLI)
3. Use test cards from the table above
4. Webhook events are forwarded to your local server

### Chapa
1. Set `CHAPA_SECRET_KEY=SANDBOX` in backend/.env
2. Clicking "Pay with Chapa" opens the local sandbox page at `localhost:3001/api/orders/chapa/sandbox`
3. Click "Confirm Payment" to simulate successful payment
4. The verify endpoint is called automatically → order marked paid
