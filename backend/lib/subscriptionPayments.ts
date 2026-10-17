/**
 * lib/subscriptionPayments.ts — Prepaid ETB subscription payments through Chapa.
 *
 * Flow:
 *   1. `startCheckout` quotes the amount (lib/subscriptionBilling.ts), stores a
 *      'pending' subscription_payments row and returns Chapa's checkout URL.
 *   2. Chapa's webhook, its callback, or the owner's return page calls
 *      `confirmPayment(txRef)`. It always re-verifies with Chapa, then, under
 *      row locks, marks the payment paid exactly once, extends the business's
 *      period, assigns a receipt number and (optionally) publishes the draft
 *      the owner was trying to publish.
 *
 * A payment is never applied twice (row lock + status check), never applied
 * for less than its quoted amount, and periods are recomputed at confirmation
 * so payments that land out of order still extend from the latest end date.
 */
import crypto from 'crypto';
import pool from '../db/pool';
import logger from './logger';
import { getPrimaryFrontendUrl } from './frontendUrl';
import { addMonths, planForTier, quote, QUOTE_ERROR_MESSAGES, type CurrentSubscription, type PaidTier, type Quote } from './subscriptionBilling';
import { apiBaseUrl, initializeCheckout, verifyTransaction } from './chapaClient';
import { canPublishBusinessSite } from './businessSubscriptionPolicy';
import { announceShowroomPublished, type PublishedShowroom } from './showroomAnnouncement';
import { invalidateSubCache } from '../middleware/tierLimit';

export class CheckoutError extends Error {
  constructor(public status: number, public code: string, message: string, public details: Record<string, unknown> = {}) {
    super(message);
  }
}

async function currentSubscription(businessId: string): Promise<CurrentSubscription | null> {
  const { rows } = await pool.query<CurrentSubscription>(
    'SELECT tier, status, current_period_end, stripe_subscription_id FROM business_subscriptions WHERE business_id = $1',
    [businessId],
  );
  return rows[0] ?? null;
}

export async function previewCheckout(businessId: string, tier: unknown, months: unknown): Promise<Quote> {
  const result = quote(await currentSubscription(businessId), tier, months);
  if ('error' in result) throw new CheckoutError(400, result.error, QUOTE_ERROR_MESSAGES[result.error]);
  return result;
}

export interface StartCheckoutInput {
  userId: string;
  businessId: string;
  tier: unknown;
  months: unknown;
  draftId?: string | null;
}

export async function startCheckout(input: StartCheckoutInput): Promise<{ checkoutUrl: string; txRef: string; quote: Quote }> {
  const q = await previewCheckout(input.businessId, input.tier, input.months);

  if (input.draftId) {
    const draft = await pool.query(
      `SELECT id FROM showrooms WHERE id = $1 AND owner_id = $2 AND business_id = $3 AND status = 'draft'
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [input.draftId, input.userId, input.businessId],
    );
    if (!draft.rowCount) throw new CheckoutError(404, 'draft_not_found', 'That website draft was not found or has expired.');
  }

  const { rows: [owner] } = await pool.query<{ email: string | null; full_name: string | null; phone: string | null; business_name: string }>(
    `SELECT u.email, u.full_name, up.phone, b.business_name
       FROM businesses b JOIN users u ON u.id = b.owner_id
       LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE b.id = $1`,
    [input.businessId],
  );

  const txRef = `nbsub-${crypto.randomUUID()}`;
  await pool.query(
    `INSERT INTO subscription_payments (business_id, user_id, provider, provider_ref, kind, tier, months, amount, currency, draft_id)
     VALUES ($1, $2, 'chapa', $3, $4, $5, $6, $7, 'ETB', $8)`,
    [input.businessId, input.userId, txRef, q.kind, q.tier, q.months, q.amount, input.draftId ?? null],
  );

  const frontend = getPrimaryFrontendUrl();
  const [firstName, ...rest] = String(owner?.full_name ?? '').trim().split(/\s+/);
  try {
    const { checkoutUrl } = await initializeCheckout({
      txRef,
      amount: q.amount,
      currency: 'ETB',
      email: owner?.email,
      firstName: firstName || null,
      lastName: rest.join(' ') || null,
      phone: owner?.phone,
      title: 'NodBusiness plan',
      description: `${planForTier(q.tier).label} plan ${q.months ? `${q.months} month${q.months === 1 ? '' : 's'}` : 'upgrade'}`,
      callbackUrl: `${apiBaseUrl()}/api/subscriptions/chapa/callback?tx_ref=${encodeURIComponent(txRef)}`,
      returnUrl: `${frontend}/business/subscription/return?tx_ref=${encodeURIComponent(txRef)}&businessId=${encodeURIComponent(input.businessId)}`,
    });
    return { checkoutUrl, txRef, quote: q };
  } catch (err) {
    await pool.query(
      `UPDATE subscription_payments SET status = 'failed', failure_reason = $2, updated_at = NOW() WHERE provider_ref = $1`,
      [txRef, String((err as Error).message).slice(0, 300)],
    );
    throw err;
  }
}

export type ConfirmOutcome = 'paid' | 'already_paid' | 'pending' | 'failed' | 'not_found';

interface PaymentRow {
  id: string;
  business_id: string;
  user_id: string | null;
  kind: string;
  tier: PaidTier;
  months: number;
  amount: string;
  status: string;
  draft_id: string | null;
}

/** Re-verifies with Chapa and applies the payment once. Safe to call any number of times. */
export async function confirmPayment(txRef: string): Promise<{ outcome: ConfirmOutcome; businessId?: string }> {
  const { rows: [known] } = await pool.query<{ status: string; business_id: string }>(
    'SELECT status, business_id FROM subscription_payments WHERE provider_ref = $1',
    [txRef],
  );
  if (!known) return { outcome: 'not_found' };
  if (known.status === 'paid') return { outcome: 'already_paid', businessId: known.business_id };

  const verification = await verifyTransaction(txRef);
  if (!verification.paid) {
    if (['failed', 'cancelled'].includes(verification.status)) {
      await pool.query(
        `UPDATE subscription_payments SET status = 'failed', failure_reason = $2, updated_at = NOW()
          WHERE provider_ref = $1 AND status = 'pending'`,
        [txRef, `chapa:${verification.status}`],
      );
      return { outcome: 'failed', businessId: known.business_id };
    }
    return { outcome: 'pending', businessId: known.business_id };
  }

  const client = await pool.connect();
  let published: PublishedShowroom | null = null;
  let draftToPublish: { id: string; ownerId: string; businessId: string } | null = null;
  let payment: PaymentRow | undefined;
  try {
    await client.query('BEGIN');
    ({ rows: [payment] } = await client.query<PaymentRow>(
      'SELECT id, business_id, user_id, kind, tier, months, amount, status, draft_id FROM subscription_payments WHERE provider_ref = $1 FOR UPDATE',
      [txRef],
    ));
    if (!payment) { await client.query('ROLLBACK'); return { outcome: 'not_found' }; }
    if (payment.status === 'paid') { await client.query('COMMIT'); return { outcome: 'already_paid', businessId: payment.business_id }; }

    const expected = Number(payment.amount);
    if (verification.currency !== 'ETB' || verification.amount === null || verification.amount + 0.005 < expected) {
      await client.query(
        `UPDATE subscription_payments SET status = 'failed', failure_reason = $2, updated_at = NOW() WHERE id = $1`,
        [payment.id, `amount_mismatch: got ${verification.amount} ${verification.currency}, expected ${expected} ETB`],
      );
      await client.query('COMMIT');
      logger.error({ txRef, got: verification.amount, currency: verification.currency, expected }, 'Chapa payment amount did not match the quote');
      return { outcome: 'failed', businessId: payment.business_id };
    }

    const { rows: [sub] } = await client.query<CurrentSubscription>(
      `SELECT tier, status, current_period_end, stripe_subscription_id FROM business_subscriptions
        WHERE business_id = $1 FOR UPDATE`,
      [payment.business_id],
    );
    const now = new Date();
    const applied = quote(sub ?? null, payment.tier, payment.months, now);
    let tier: PaidTier = payment.tier;
    let periodStart: Date;
    let periodEnd: Date;
    if ('error' in applied) {
      // The business changed since checkout (e.g. another payment upgraded it).
      // Never lose money: add the paid months on top of the current period.
      const currentEnd = sub?.current_period_end ? new Date(sub.current_period_end) : now;
      periodStart = currentEnd.getTime() > now.getTime() ? currentEnd : now;
      periodEnd = addMonths(periodStart, Math.max(payment.months, 1));
      tier = (sub && sub.tier !== 'freemium' ? sub.tier : payment.tier) as PaidTier;
      logger.warn({ txRef, reason: applied.error }, 'Subscription payment applied as an extension of the current plan');
    } else {
      periodStart = applied.periodStart;
      periodEnd = applied.periodEnd;
    }

    await client.query(
      `INSERT INTO business_subscriptions
         (business_id, tier, status, currency, billing_provider, current_period_start, current_period_end, cancel_at_period_end)
       VALUES ($1, $2, 'active', 'ETB', 'chapa', $3, $4, FALSE)
       ON CONFLICT (business_id) DO UPDATE SET
         tier = EXCLUDED.tier, status = 'active', currency = 'ETB', billing_provider = 'chapa',
         current_period_start = LEAST(COALESCE(business_subscriptions.current_period_start, EXCLUDED.current_period_start), EXCLUDED.current_period_start),
         current_period_end = GREATEST(COALESCE(business_subscriptions.current_period_end, EXCLUDED.current_period_end), EXCLUDED.current_period_end),
         cancel_at_period_end = FALSE, updated_at = NOW()`,
      [payment.business_id, tier, periodStart, periodEnd],
    );
    await client.query(
      `UPDATE subscription_payments
          SET status = 'paid', paid_at = NOW(), period_start = $2, period_end = $3, failure_reason = NULL,
              receipt_number = 'NB-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('subscription_receipt_seq')::text, 6, '0'),
              updated_at = NOW()
        WHERE id = $1`,
      [payment.id, periodStart, periodEnd],
    );
    if (payment.user_id) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, 'business', $2, $3, $4)`,
        [
          payment.user_id,
          'Payment received',
          `Your ${planForTier(tier).label} plan is active until ${periodEnd.toDateString()}. Your receipt is in Billing history.`,
          `/business/subscription?businessId=${payment.business_id}`,
        ],
      );
    }
    if (payment.draft_id && payment.user_id) {
      draftToPublish = { id: payment.draft_id, ownerId: payment.user_id, businessId: payment.business_id };
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  await invalidateSubCache(payment!.business_id).catch(() => undefined);

  // Publish the draft the owner was publishing when the plan was required.
  if (draftToPublish) {
    try {
      const { rows: [draft] } = await pool.query<{ sections: unknown }>(
        `SELECT sections FROM showrooms WHERE id = $1 AND owner_id = $2 AND business_id = $3 AND status = 'draft'`,
        [draftToPublish.id, draftToPublish.ownerId, draftToPublish.businessId],
      );
      if (draft && await canPublishBusinessSite(draftToPublish.businessId, draftToPublish.ownerId, draft.sections)) {
        const { rows: [site] } = await pool.query<PublishedShowroom>(
          `UPDATE showrooms SET status = 'published', expires_at = NULL, updated_at = NOW()
            WHERE id = $1 AND status = 'draft' RETURNING id, owner_id, slug, title, description, cover_image`,
          [draftToPublish.id],
        );
        published = site ?? null;
        if (published) void announceShowroomPublished(published);
      }
    } catch (err) {
      logger.error({ err: (err as Error).message, txRef }, 'Paid, but publishing the saved draft failed');
    }
  }

  return { outcome: 'paid', businessId: payment!.business_id };
}

export interface PaymentHistoryRow {
  id: string;
  kind: string;
  tier: string;
  months: number;
  amount: string;
  currency: string;
  status: string;
  provider: string;
  receipt_number: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

export async function paymentHistory(businessId: string, limit = 50): Promise<PaymentHistoryRow[]> {
  const { rows } = await pool.query<PaymentHistoryRow>(
    `SELECT id, kind, tier, months, amount, currency, status, provider, receipt_number,
            period_start, period_end, paid_at, created_at
       FROM subscription_payments
      WHERE business_id = $1 AND (status <> 'pending' OR created_at > NOW() - INTERVAL '1 day')
      ORDER BY created_at DESC
      LIMIT $2`,
    [businessId, Math.min(Math.max(limit, 1), 100)],
  );
  return rows;
}

/** Pending checkouts older than a day were abandoned. */
export async function expireAbandonedCheckouts(): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE subscription_payments SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 day'`,
  );
  return rowCount ?? 0;
}
