/**
 * routes/subscriptions.ts — Business subscription lifecycle
 *
 * Endpoints:
 *   GET  /api/subscriptions/plans    — public plan listing
 *   GET  /api/subscriptions/my       — caller's current subscription
 *   POST /api/subscriptions/create   — Stripe Checkout Session for upgrade
 *   POST /api/subscriptions/cancel   — schedule cancellation at period end
 *   POST /api/subscriptions/webhook  — Stripe subscription webhook (raw body)
 *
 * Stripe events handled:
 *   checkout.session.completed        → activate subscription
 *   customer.subscription.updated     → sync tier changes, renewals
 *   customer.subscription.deleted     → downgrade to freemium
 *   invoice.paid                      → renewal: extend current_period_end
 *   invoice.payment_failed            → set status to past_due
 *
 * Billing periods: from Stripe API 2025-03-31 on (stripe@23 pins 2026-09-30),
 * current_period_start/end live on subscription items, not the subscription;
 * subscriptionPeriod() reads them from the items. The period end drives
 * scripts/business-subscription-lifecycle.js, which removes businesses whose
 * period lapsed, so renewals must move it forward.
 *
 * Integration:
 *   - Uses webhook_events table for idempotency (same pattern as orders.ts)
 *   - Invalidates Redis sub:{business_id} cache after every tier change
 *   - Sends push notification on payment failure
 *
 * Files touched:
 *   backend/routes/subscriptions.ts   (this file)
 *   backend/lib/subscriptionPlans.ts  (plan definitions)
 *   backend/middleware/tierLimit.ts   (cache invalidation)
 *   backend/db/migrate37.js           (business_subscriptions table)
 *   backend/index.ts                  (route registration)
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_SUBSCRIPTION_WEBHOOK_SECRET   (separate from order webhook secret)
 *   STRIPE_PRICE_PREMIUM_MONTHLY
 *   STRIPE_PRICE_PRO_MONTHLY
 *   FRONTEND_URL
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../db/pool';
import logger from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import { invalidateSubCache } from '../middleware/tierLimit';
import { PLANS, type PlanKey, type Tier } from '../lib/subscriptionPlans';
import { getPrimaryFrontendUrl } from '../lib/frontendUrl';
import { sendPushToUser } from './push';
import { isStripeConfigured, stripeClientFacade, withVerifiedStripeWebhook } from '../lib/stripeClient';
import { requireIsolatedPaymentEnvironment } from '../middleware/demoEnvironment';
import { requireFeatureFlag } from '../middleware/featureFlag';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe: any = stripeClientFacade();

const SUB_WEBHOOK_SECRET = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET ?? '';

// ── Helper: get business_id for authenticated user ────────────────────────────
async function getBusinessId(userId: string): Promise<string | null> {
  const { rows } = await pool.query(
    'SELECT id FROM businesses WHERE owner_id = $1 LIMIT 1',
    [userId],
  );
  return rows[0]?.id ?? null;
}

// ── GET /plans — public plan listing ─────────────────────────────────────────
router.get('/plans', (_req: Request, res: Response) => {
  res.json({
    freemium: {
      tier: 'freemium',
      label: 'Free',
      priceUsd: 0,
      priceEtb: 0,
      limits: { maxSections: 5, maxShowrooms: 1, maxProducts: 50, maxStorageGB: 5 },
      features: ['5 builder sections', '1 showroom', '50 products', '5GB storage', 'Basic sections'],
    },
    ...Object.fromEntries(
      Object.entries(PLANS).map(([key, plan]) => [key, plan]),
    ),
  });
});

// ── GET /my — caller's current subscription ───────────────────────────────────
router.get('/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.user!.id);
    if (!businessId) {
      res.json({ tier: 'freemium', status: 'active', businessId: null });
      return;
    }

    const { rows } = await pool.query(
      `SELECT tier, status, current_period_start, current_period_end,
              cancel_at_period_end, product_count, storage_used_bytes
       FROM business_subscriptions
       WHERE business_id = $1`,
      [businessId],
    );

    if (!rows.length) {
      res.json({ tier: 'freemium', status: 'active', businessId });
      return;
    }

    res.json({ ...rows[0], businessId });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'GET /subscriptions/my failed');
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ── POST /create — Stripe Checkout Session for upgrade ───────────────────────
router.post('/create', requireAuth, requireIsolatedPaymentEnvironment, requireFeatureFlag('stripe_payments', 'Stripe payments temporarily disabled'), async (req: Request, res: Response) => {
  if (!isStripeConfigured()) {
    res.status(503).json({ error: 'Stripe is not configured for this environment.' });
    return;
  }

  const { plan } = req.body as { plan?: string };
  if (!plan || !(plan in PLANS)) {
    res.status(400).json({ error: 'Invalid plan. Use premium_monthly or pro_monthly.' });
    return;
  }

  const planDef = PLANS[plan as PlanKey];

  if (!planDef.stripePriceId) {
    res.status(503).json({ error: `Price ID not configured for ${plan}. Add ${plan === 'premium_monthly' ? 'STRIPE_PRICE_PREMIUM_MONTHLY' : 'STRIPE_PRICE_PRO_MONTHLY'} env var.` });
    return;
  }

  try {
    const businessId = await getBusinessId(req.user!.id);
    const frontendUrl = getPrimaryFrontendUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: planDef.stripePriceId, quantity: 1 }],
      success_url: `${frontendUrl}/business/subscription?upgraded=1`,
      cancel_url:  `${frontendUrl}/business/subscription?cancelled=1`,
      metadata: {
        user_id:     req.user!.id,
        business_id: businessId ?? '',
        plan_key:    plan,
        tier:        planDef.tier,
      },
    });

    res.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Stripe subscription create failed');
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ── POST /cancel — schedule cancellation at period end ───────────────────────
router.post('/cancel', requireAuth, requireIsolatedPaymentEnvironment, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.user!.id);
    if (!businessId) {
      res.status(404).json({ error: 'No business found' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT stripe_subscription_id FROM business_subscriptions WHERE business_id = $1',
      [businessId],
    );

    if (!rows.length || !rows[0].stripe_subscription_id) {
      res.status(404).json({ error: 'No active subscription found' });
      return;
    }

    if (stripe) {
      await stripe.subscriptions.update(rows[0].stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    await pool.query(
      'UPDATE business_subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW() WHERE business_id = $1',
      [businessId],
    );

    await invalidateSubCache(businessId);
    res.json({ success: true, message: 'Subscription will cancel at end of billing period.' });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Cancel subscription failed');
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ── POST /webhook — Stripe subscription events ────────────────────────────────
// NOTE: This route requires raw body — registered in index.ts BEFORE express.json()
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    await withVerifiedStripeWebhook(
      req.body as Buffer,
      req.headers['stripe-signature'] as string | undefined,
      { real: SUB_WEBHOOK_SECRET, demo: process.env.STRIPE_TEST_SUBSCRIPTION_WEBHOOK_SECRET },
      async (event: { id: string; type: string; data: { object: Record<string, unknown> } }) => {
        // Atomic claim on webhook_events (migrate20.js: id, type, processed_at),
        // same pattern as the order webhook in orders.ts.
        const claimed = await pool.query(
          'INSERT INTO webhook_events (id,type) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING RETURNING id',
          [event.id, event.type],
        );
        if (!claimed.rows.length) { res.json({ received: true, duplicate: true }); return; }
        try {
          await handleSubscriptionEvent(event);
        } catch (err) {
          await pool.query('DELETE FROM webhook_events WHERE id=$1', [event.id]).catch(() => undefined);
          throw err;
        }
        res.json({ received: true });
      },
    );
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('signature')) { res.status(400).json({ error: 'Invalid signature' }); return; }
    logger.error({ err: message }, 'Subscription webhook handler failed');
    res.status(500).json({ error: 'Handler failed' });
  }
});

// ── Billing period helpers ────────────────────────────────────────────────────
type StripeSubscriptionLike = {
  status?: string;
  current_period_start?: unknown;
  current_period_end?: unknown;
  items?: { data?: Array<{ current_period_start?: unknown; current_period_end?: unknown }> };
};

const STRIPE_STATUS_MAP: Record<string, string> = {
  active: 'active', trialing: 'trialing',
  past_due: 'past_due', canceled: 'cancelled',
  unpaid: 'past_due',
};

function stripeTimestampToDate(value: unknown): Date | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? new Date(value * 1000)
    : null;
}

/**
 * Billing period of a Stripe subscription. Uses the item with the latest
 * current_period_end (items carry the period on current API versions) and
 * falls back to the legacy subscription-level fields. Never returns an
 * Invalid Date: missing values come back as null so the SQL keeps the
 * stored period.
 */
export function subscriptionPeriod(sub: StripeSubscriptionLike | null | undefined): { start: Date | null; end: Date | null } {
  let start: Date | null = null;
  let end: Date | null = null;
  for (const item of sub?.items?.data ?? []) {
    const itemEnd = stripeTimestampToDate(item.current_period_end);
    if (itemEnd && (!end || itemEnd > end)) {
      end = itemEnd;
      start = stripeTimestampToDate(item.current_period_start);
    }
  }
  if (!end) {
    end = stripeTimestampToDate(sub?.current_period_end);
    start = stripeTimestampToDate(sub?.current_period_start);
  }
  return { start, end };
}

function invoiceSubscriptionId(invoice: Record<string, unknown>): string | null {
  const parent = invoice.parent as { subscription_details?: { subscription?: unknown } | null } | null | undefined;
  const ref = parent?.subscription_details?.subscription ?? invoice.subscription;
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && typeof (ref as { id?: unknown }).id === 'string') return (ref as { id: string }).id;
  return null;
}

// ── Internal event handler ────────────────────────────────────────────────────
async function handleSubscriptionEvent(
  event: { type: string; data: { object: Record<string, unknown> } },
): Promise<void> {
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const meta = (obj.metadata ?? {}) as Record<string, string>;
      const businessId = meta.business_id;
      const tier = (meta.tier ?? 'freemium') as Tier;
      const stripeSubId = (obj.subscription as string) ?? null;
      const stripeCustomerId = (obj.customer as string) ?? null;

      if (!businessId) break;

      // Retrieve subscription dates from Stripe if available
      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;
      if (stripe && stripeSubId) {
        try {
          ({ start: periodStart, end: periodEnd } = subscriptionPeriod(await stripe.subscriptions.retrieve(stripeSubId)));
        } catch (err) {
          // Non-fatal: customer.subscription.updated / invoice.paid set the period.
          logger.warn({ err: (err as Error).message, stripeSubId }, 'Subscription period lookup failed');
        }
      }

      await pool.query(
        `INSERT INTO business_subscriptions
           (business_id, tier, status, stripe_subscription_id, stripe_customer_id,
            current_period_start, current_period_end, cancel_at_period_end)
         VALUES ($1, $2, 'active', $3, $4, $5, $6, FALSE)
         ON CONFLICT (business_id) DO UPDATE SET
           tier = EXCLUDED.tier,
           status = 'active',
           stripe_subscription_id = EXCLUDED.stripe_subscription_id,
           stripe_customer_id = EXCLUDED.stripe_customer_id,
           current_period_start = COALESCE(EXCLUDED.current_period_start, business_subscriptions.current_period_start),
           current_period_end   = COALESCE(EXCLUDED.current_period_end,   business_subscriptions.current_period_end),
           cancel_at_period_end = FALSE,
           updated_at = NOW()`,
        [businessId, tier, stripeSubId, stripeCustomerId, periodStart, periodEnd],
      );

      await invalidateSubCache(businessId);
      logger.info({ businessId, tier }, 'Subscription activated');
      break;
    }

    case 'customer.subscription.updated': {
      const stripeSubId = obj.id as string;
      const status = obj.status as string;
      const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
      const { start: periodStart, end: periodEnd } = subscriptionPeriod(obj as StripeSubscriptionLike);

      const { rows } = await pool.query(
        'SELECT business_id FROM business_subscriptions WHERE stripe_subscription_id = $1',
        [stripeSubId],
      );
      if (!rows.length) break;

      const businessId = rows[0].business_id as string;

      // GREATEST (which skips NULL): a late, out-of-order snapshot must not
      // pull the period end back — the lifecycle job removes lapsed businesses.
      await pool.query(
        `UPDATE business_subscriptions SET
           status = $1, cancel_at_period_end = $2,
           current_period_start = COALESCE($3, current_period_start),
           current_period_end   = GREATEST(current_period_end, $4),
           updated_at = NOW()
         WHERE stripe_subscription_id = $5`,
        [STRIPE_STATUS_MAP[status] ?? 'active', cancelAtPeriodEnd, periodStart, periodEnd, stripeSubId],
      );

      await invalidateSubCache(businessId);
      logger.info({ businessId, status }, 'Subscription updated');
      break;
    }

    case 'customer.subscription.deleted': {
      const stripeSubId = obj.id as string;
      const { rows } = await pool.query(
        'SELECT business_id FROM business_subscriptions WHERE stripe_subscription_id = $1',
        [stripeSubId],
      );
      if (!rows.length) break;

      const businessId = rows[0].business_id as string;

      await pool.query(
        `UPDATE business_subscriptions SET
           tier = 'freemium', status = 'cancelled', updated_at = NOW()
         WHERE stripe_subscription_id = $1`,
        [stripeSubId],
      );

      await invalidateSubCache(businessId);
      logger.info({ businessId }, 'Subscription cancelled — downgraded to freemium');
      break;
    }

    case 'invoice.paid': {
      // Renewal (or first) payment. Re-read the subscription so the stored
      // period follows Stripe even if customer.subscription.updated is missed.
      const stripeSubId = invoiceSubscriptionId(obj);
      if (!stripeSubId) break;

      const { rows } = await pool.query(
        'SELECT business_id FROM business_subscriptions WHERE stripe_subscription_id = $1',
        [stripeSubId],
      );
      if (!rows.length) break;
      const businessId = rows[0].business_id as string;

      // A lookup failure throws on purpose: the webhook claim is released and
      // Stripe redelivers, instead of the period silently not moving.
      const sub = await stripe.subscriptions.retrieve(stripeSubId) as StripeSubscriptionLike;
      const { start: periodStart, end: periodEnd } = subscriptionPeriod(sub);

      await pool.query(
        `UPDATE business_subscriptions SET
           status = $1,
           current_period_start = COALESCE($2, current_period_start),
           current_period_end   = GREATEST(current_period_end, $3),
           updated_at = NOW()
         WHERE stripe_subscription_id = $4`,
        [STRIPE_STATUS_MAP[sub.status ?? ''] ?? 'active', periodStart, periodEnd, stripeSubId],
      );

      await invalidateSubCache(businessId);
      logger.info({ businessId, periodEnd }, 'Subscription invoice paid — period extended');
      break;
    }

    case 'invoice.payment_failed': {
      const stripeCustomerId = obj.customer as string;
      const { rows } = await pool.query(
        'SELECT business_id, (SELECT owner_id FROM businesses WHERE id = business_id) AS user_id FROM business_subscriptions WHERE stripe_customer_id = $1',
        [stripeCustomerId],
      );
      if (!rows.length) break;

      const { business_id: businessId, user_id: userId } = rows[0];

      await pool.query(
        `UPDATE business_subscriptions SET status = 'past_due', updated_at = NOW() WHERE business_id = $1`,
        [businessId],
      );

      await invalidateSubCache(businessId);

      // Notify owner
      if (userId) {
        sendPushToUser(
          userId,
          'Payment failed',
          'Your Nodbusiness subscription payment failed. Update your payment method to keep your features.',
          '/business/subscription',
        ).catch(() => undefined);
      }

      logger.warn({ businessId }, 'Subscription payment failed — status set to past_due');
      break;
    }
  }
}

module.exports = router;
module.exports.subscriptionPeriod = subscriptionPeriod;
