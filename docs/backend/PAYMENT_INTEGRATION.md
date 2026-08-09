# Empire X — Payment Integration Guide

> Complete technical reference for Stripe and Chapa payment integrations.
> **Last updated:** August 2026

---

## Overview

Empire X supports two payment providers:

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
- `backend/routes/wallet.js` — wallet top-up via Stripe
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
// This is set BEFORE express.json() in index.js:
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

### Architecture

```
Frontend → POST /api/orders/checkout/chapa
                    ↓
         Chapa Hosted Checkout (or sandbox page)
                    ↓
         User pays via Telebirr/CBE/etc.
                    ↓
         Chapa redirects to /marketplace?payment=success
                    ↓
         Chapa sends webhook POST /api/orders/chapa/webhook
         (also: GET /api/orders/chapa/verify/:tx_ref)
```

### Key Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/orders/checkout/chapa` | Initialize Chapa checkout for a product |
| `GET /api/orders/chapa/verify/:tx_ref` | Verify Chapa payment (called by Chapa + frontend) |
| `POST /api/orders/chapa/webhook` | Server-to-server webhook from Chapa |
| `GET /api/orders/chapa/sandbox` | Local sandbox simulation page |
| `GET /api/orders/chapa/status/:tx_ref` | Frontend polls for payment status |

### Sandbox Mode

```bash
# Set in backend/.env for local development:
CHAPA_SECRET_KEY=SANDBOX
```

With `SANDBOX` as the key, Chapa calls are intercepted and a local sandbox page is shown instead of the real Chapa checkout. No real money moves.

### Transaction Reference Format

```javascript
// Order payments
const tx_ref = `empx-${req.user.id.slice(0, 8)}-${Date.now()}`;

// Wallet top-ups
const tx_ref = `empx-wallet-${req.user.id.slice(0, 8)}-${Date.now()}`;
```

### PurchaseModal Chapa Flow

```javascript
// Open Chapa in a new tab while modal stays open
window.open(data.checkout_url, '_blank', 'width=500,height=700,noopener');
setChapaTxRef(data.tx_ref);
setStep("chapa_pending");

// Poll every 3 seconds for payment confirmation
const interval = setInterval(async () => {
  const { data } = await client.get(`/api/orders/chapa/status/${chapaTxRef}`);
  if (data.status === "paid") {
    clearInterval(interval);
    setStep("success");
  }
}, 3000);
```

### Webhook Registration

Register this URL in Chapa Dashboard → Settings → Webhooks:
```
https://your-api.railway.app/api/orders/chapa/webhook
```

---

## Wallet Top-up via Stripe

```javascript
// POST /api/wallet/topup/stripe
// Creates a Stripe checkout session for wallet top-up

const sessionParams = {
  mode: 'payment',
  line_items: [{ price_data: { currency, product_data: { name: 'Empire X Wallet Top-up' }, unit_amount: toCents(cur) }, quantity: 1 }],
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
