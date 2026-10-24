/**
 * Which business sells a product, and whether buyers can pay it.
 *
 * Products created from the normal "Add Product" form carried no business,
 * so checkout found no payment details and buyers could not order (audit
 * FUNC-03). A product now belongs to, in order:
 *   1. its own business_id,
 *   2. the business of its showroom,
 *   3. the seller's business, when the seller has exactly one.
 * A seller with several businesses must choose one when listing.
 *
 * Buyers can order only while that business has a paid plan and an active
 * payment method (checkoutReadiness); otherwise the seller is told why.
 */
import pool from '../db/pool';
import { getBusinessSubscriptionAccess } from './businessSubscriptionPolicy';

type Queryable = { query: typeof pool.query };

/** The owner's business when they have exactly one; otherwise null. */
export async function soleBusinessOf(ownerId: string, db: Queryable = pool): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    'SELECT id FROM businesses WHERE owner_id=$1 ORDER BY created_at LIMIT 2',
    [ownerId],
  );
  return rows.length === 1 ? rows[0].id : null;
}

/** Resolves the selling business for a product row (see the order above). */
export async function resolveProductBusiness(
  product: { business_id?: unknown; showroom_id?: unknown; seller_id?: unknown },
  db: Queryable = pool,
): Promise<string | null> {
  if (typeof product.business_id === 'string' && product.business_id) return product.business_id;
  if (typeof product.showroom_id === 'string' && product.showroom_id) {
    const { rows } = await db.query<{ business_id: string | null }>('SELECT business_id FROM showrooms WHERE id=$1', [product.showroom_id]);
    if (rows[0]?.business_id) return rows[0].business_id;
  }
  if (typeof product.seller_id !== 'string' || !product.seller_id) return null;
  return soleBusinessOf(product.seller_id, db);
}

/** True when the business has at least one active payment account buyers can pay into. */
export async function hasActivePaymentAccount(businessId: string | null, db: Queryable = pool): Promise<boolean> {
  if (!businessId) return false;
  const { rows } = await db.query<{ ok: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM business_payment_accounts WHERE business_id=$1 AND is_active=TRUE) AS ok',
    [businessId],
  );
  return rows[0]?.ok === true;
}

/** Why buyers cannot order yet, in the order the seller should fix it. */
export type CheckoutBlocker = 'no_business' | 'no_plan' | 'no_payment_method';

/**
 * Whether buyers can order from this business today. A business product is
 * listed and sold only while the business has a paid plan (the same gate as
 * checkout and the marketplace list), and only with a payment method.
 */
export async function checkoutReadiness(businessId: string | null): Promise<{ ready: boolean; blocker: CheckoutBlocker | null }> {
  if (!businessId) return { ready: false, blocker: 'no_business' };
  const access = await getBusinessSubscriptionAccess(businessId);
  if (!access || access.hiddenFromPublic) return { ready: false, blocker: 'no_plan' };
  if (!(await hasActivePaymentAccount(businessId))) return { ready: false, blocker: 'no_payment_method' };
  return { ready: true, blocker: null };
}
