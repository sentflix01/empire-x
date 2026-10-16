/**
 * migrate56.js - Seller payment details and contact-field privacy.
 *
 * NodBusiness never holds customer funds: buyers pay sellers directly, so each
 * Business can list the payment accounts it accepts (bank, mobile money).
 * Contact fields are public only when the owner chooses: by default the
 * business phone and email; the business address stays private, and the
 * pickup address is shown to a buyer only after an order is placed.
 * See docs/decisions/platform-model-decisions.md §2.
 */
module.exports = async function migrate56(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_payment_accounts (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      method         TEXT NOT NULL CHECK (method IN ('bank', 'mobile_money', 'other')),
      provider_name  TEXT NOT NULL CHECK (char_length(provider_name) BETWEEN 1 AND 80),
      account_name   TEXT NOT NULL CHECK (char_length(account_name) BETWEEN 1 AND 120),
      account_number TEXT NOT NULL CHECK (char_length(account_number) BETWEEN 1 AND 60),
      instructions   TEXT CHECK (instructions IS NULL OR char_length(instructions) <= 500),
      is_active      BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order     INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_business_payment_accounts_business ON business_payment_accounts(business_id, sort_order);

    ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS public_contact_fields TEXT[] NOT NULL DEFAULT ARRAY['business_contact_phone', 'business_contact_email'],
      ADD COLUMN IF NOT EXISTS pickup_address TEXT;
    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS public_contact_fields TEXT[] NOT NULL DEFAULT ARRAY['business_contact_phone', 'business_contact_email'];
  `);
};
