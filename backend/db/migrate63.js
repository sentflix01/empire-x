/**
 * migrate63.js - Provider-neutral subscription payments (Phase 1, Chapa ETB).
 *
 * Chapa has no recurring billing: each period is prepaid with a one-time
 * checkout (owner decisions 2026-10-17: prepay 1, 3, 6 or 12 months with
 * reminders; an upgrade pays the price difference for the days left).
 * Every checkout is one row here, from 'pending' to 'paid' (or 'failed' /
 * 'expired'). The row fixes the amount at checkout; the period is set when
 * the payment is confirmed, so concurrent payments extend in order.
 *
 * provider_ref is the provider's transaction reference (Chapa tx_ref) and is
 * unique, which makes webhook and callback processing idempotent.
 * receipt_number is assigned once, when the payment is confirmed.
 * Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate63(pool) {
  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS subscription_receipt_seq;

    CREATE TABLE IF NOT EXISTS subscription_payments (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id     UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
      provider        TEXT        NOT NULL CHECK (provider IN ('chapa', 'telebirr', 'stripe')),
      provider_ref    TEXT        NOT NULL UNIQUE,
      kind            TEXT        NOT NULL CHECK (kind IN ('new', 'renewal', 'upgrade')),
      tier            TEXT        NOT NULL CHECK (tier IN ('normal', 'premium', 'pro')),
      months          INTEGER     NOT NULL CHECK (months BETWEEN 0 AND 12),
      amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      currency        TEXT        NOT NULL DEFAULT 'ETB' CHECK (currency IN ('ETB', 'USD')),
      status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
      draft_id        UUID        REFERENCES showrooms(id) ON DELETE SET NULL,
      period_start    TIMESTAMPTZ,
      period_end      TIMESTAMPTZ,
      receipt_number  TEXT        UNIQUE,
      paid_at         TIMESTAMPTZ,
      failure_reason  TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_subscription_payments_business_created
      ON subscription_payments (business_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_subscription_payments_pending
      ON subscription_payments (created_at) WHERE status = 'pending';

    ALTER TABLE business_subscriptions ADD COLUMN IF NOT EXISTS billing_provider TEXT;
  `);
};
