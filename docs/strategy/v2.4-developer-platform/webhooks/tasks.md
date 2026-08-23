# Webhook System — Tasks

## Status: 🔴 Not Started

---

## What Webhooks Enable

When something happens on Nodbusiness (new order, new message, task completed),
Nodbusiness instantly POSTs a JSON payload to any URL the developer registered.

Use cases:
- ERP system auto-updates inventory on new order
- Accounting system records revenue when payment confirms
- SMS gateway sends custom text when order ships
- Partner platform syncs new user registrations

---

## Step 1 — Database Migration

- [ ] Create `backend/db/migrate31.js` — `webhook_subscriptions` table:
  ```sql
  CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    events      TEXT[] NOT NULL,     -- ['order.created', 'order.paid', ...]
    secret      TEXT NOT NULL,       -- HMAC signing secret (user-provided or auto-generated)
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    failure_count INTEGER NOT NULL DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhook_subscriptions(user_id);

  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,
    response_status INTEGER,
    response_body   TEXT,
    delivered_at    TIMESTAMPTZ,
    failed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```

---

## Step 2 — Supported Event Types

```
order.created         order.paid          order.completed
order.cancelled       order.refunded      order.status_changed

task.created          task.bid_received   task.bid_accepted
task.completed        task.cancelled

product.created       product.updated     product.sold_out

message.received      (new DM received)

user.registered       user.verified

showroom.published    showroom.updated

review.created        (new review on product)

payment.received      payment.failed
```

---

## Step 3 — Webhook Delivery Service

- [ ] Create `backend/lib/webhookEmitter.js`:
  ```js
  const crypto = require('crypto');

  async function emitWebhookEvent(eventType, payload, userId) {
    // 1. Find all active subscriptions for this user + event type
    // 2. For each subscription, queue a delivery job (BullMQ)
    // 3. Job delivers with HMAC signature + retry on failure
  }

  function signPayload(secret, payload) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
  ```

- [ ] Add `X-Nodbusiness-Signature: sha256=xxxxx` header on every delivery
  - Developer verifies this on their end to confirm payload is genuine

- [ ] Retry logic: 3 attempts with exponential backoff (1s, 5s, 30s)
- [ ] After 10 consecutive failures → auto-disable subscription, email owner

---

## Step 4 — Wire Into Existing Routes

Add `emitWebhookEvent()` calls at key points in existing routes:

- [ ] `routes/orders.js` — emit `order.created`, `order.paid`, `order.completed`
- [ ] `routes/tasks.js` — emit `task.created`, `task.bid_received`, `task.completed`
- [ ] `routes/products.js` — emit `product.created`, `product.updated`
- [ ] `routes/auth.ts` — emit `user.registered`, `user.verified`
- [ ] `routes/messages.js` — emit `message.received`
- [ ] `routes/showrooms.js` — emit `showroom.published`
- [ ] `routes/reviews.js` — emit `review.created`

---

## Step 5 — Webhook Management Routes

- [ ] Add to `backend/routes/developer.js`:
  ```
  GET    /api/developer/webhooks          — list subscriptions
  POST   /api/developer/webhooks          — create subscription
  PUT    /api/developer/webhooks/:id      — update URL / events
  DELETE /api/developer/webhooks/:id      — delete subscription
  POST   /api/developer/webhooks/:id/test — send test payload
  GET    /api/developer/webhooks/:id/logs — recent deliveries
  ```

---

## Step 6 — Frontend: Webhook Manager

- [ ] Add "Webhooks" tab to developer dashboard
- [ ] Form: URL + event type checkboxes + secret field
- [ ] Delivery log table: event, timestamp, status (200 OK / 500 Error), response time
- [ ] "Send test event" button: sends a sample payload immediately
- [ ] "Disable" toggle on each subscription

---

## Step 7 — Verify

- [ ] Register a webhook URL (use webhook.site for testing)
- [ ] Place an order → verify `order.created` arrives at URL within 1s
- [ ] Verify HMAC signature is correct
- [ ] Kill the URL → verify retry attempts fire
- [ ] After 10 failures → verify subscription auto-disables
