import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import logger from '../lib/logger';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { requireSignInForPersonal } from '../lib/siteVisibility';

const router = Router();
const RATE_MAX = 0.5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Attribution = { partnershipId: string; profileOwnerId: string; rate: number } | null;

export async function resolvePartnerAttribution(
  shareCode: unknown, productId: string, buyerId: string,
): Promise<Attribution> {
  if (shareCode === undefined || shareCode === null || shareCode === '') return null;
  if (typeof shareCode !== 'string' || !/^[a-f0-9]{16}$/i.test(shareCode)) {
    throw new Error('Invalid partnership link');
  }
  const { rows } = await pool.query(
    `SELECT p.id,p.profile_owner_id,p.commission_rate
       FROM profile_partnerships p
       JOIN profile_partnership_products pp ON pp.partnership_id=p.id
      WHERE p.share_code=$1 AND pp.product_id=$2 AND p.status='active'
        AND p.starts_at<=NOW() AND p.ends_at>NOW()`,
    [shareCode, productId],
  );
  if (!rows.length) throw new Error('This partnership link is expired or does not include this item');
  if (rows[0].profile_owner_id === buyerId) throw new Error('You cannot earn commission on your own purchase');
  return {
    partnershipId: String(rows[0].id),
    profileOwnerId: String(rows[0].profile_owner_id),
    rate: Number(rows[0].commission_rate),
  };
}

export async function recordProfileOwnerCommission(order: Record<string, unknown>): Promise<void> {
  if (!order.profile_partnership_id || !order.profile_owner_id || !order.profile_commission_rate) return;
  const fallbackSubtotal = Number(order.amount_subtotal);
  const fallbackDiscount = Number(order.amount_discount) || 0;
  const gross = Math.max(0, Number(order.profile_eligible_subtotal ?? (Number.isFinite(fallbackSubtotal) ? fallbackSubtotal - fallbackDiscount : order.total_price)) || 0);
  const rate = Number(order.profile_commission_rate);
  if (!gross || !Number.isFinite(rate) || rate <= 0 || rate > RATE_MAX) return;
  const amount = Math.round((gross * rate + Number.EPSILON) * 100) / 100;
  await pool.query(
    `INSERT INTO profile_owner_commissions
       (partnership_id,order_id,profile_owner_id,business_owner_id,eligible_gross,rate,amount,currency)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (order_id) DO NOTHING`,
    [order.profile_partnership_id, order.id, order.profile_owner_id, order.seller_id, gross, rate, amount, order.currency || 'ETB'],
  );
}

const AGREEMENT_SELECT = `SELECT p.*,CASE WHEN p.status='active' AND p.ends_at<=NOW() THEN 'expired' ELSE p.status END AS status,b.business_name,b.business_logo_url,
  up.display_name AS profile_owner_name,
  (SELECT COUNT(*)::int FROM profile_partnership_products pp WHERE pp.partnership_id=p.id) AS product_count
  FROM profile_partnerships p JOIN businesses b ON b.id=p.business_id
  JOIN user_profiles up ON up.user_id=p.profile_owner_id`;

router.get('/mine', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `${AGREEMENT_SELECT} WHERE p.business_owner_id=$1 OR p.profile_owner_id=$1 ORDER BY p.created_at DESC LIMIT 100`,
      [req.user!.id],
    );
    res.json({ partnerships: rows });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list profile partnerships');
    res.status(500).json({ error: 'Failed to fetch partnerships' });
  }
});

router.get('/business/:businessId/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id,p.title,p.description,p.price,p.currency,p.images
         FROM products p JOIN businesses b ON b.id=p.business_id
        WHERE b.id=$1 AND b.owner_id=$2 AND p.seller_id=$2 AND p.status='active'
        ORDER BY p.created_at DESC LIMIT 200`,
      [req.params.businessId, req.user!.id],
    );
    res.set('Cache-Control', 'private, no-store');
    res.json({ products: rows });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list partnership offerings');
    res.status(500).json({ error: 'Failed to fetch business offerings' });
  }
});

router.get('/profile/:userId', optionalAuth, requireSignInForPersonal, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id,p.profile_owner_id,p.business_owner_id,p.share_code,p.commission_rate,p.starts_at,p.ends_at,b.id AS business_id,
              b.business_name,b.business_logo_url,b.business_description,
              up.display_name AS profile_owner_name,
              COALESCE(json_agg(json_build_object('id',pr.id,'title',pr.title,'description',pr.description,
                'price',pr.price,'currency',pr.currency,'images',pr.images)) FILTER (WHERE pr.id IS NOT NULL),'[]') AS products
       FROM profile_partnerships p
       JOIN businesses b ON b.id=p.business_id
       JOIN user_profiles up ON up.user_id=p.profile_owner_id
       JOIN users creator_user ON creator_user.id=p.profile_owner_id
       JOIN users merchant_user ON merchant_user.id=p.business_owner_id
       JOIN profile_partnership_products pp ON pp.partnership_id=p.id
       JOIN products pr ON pr.id=pp.product_id AND pr.status='active'
       WHERE p.profile_owner_id=$1 AND p.status='active' AND p.starts_at<=NOW() AND p.ends_at>NOW()
         AND ($2::boolean=FALSE OR (creator_user.is_seed=FALSE AND creator_user.is_demo=FALSE AND merchant_user.is_seed=FALSE AND merchant_user.is_demo=FALSE))
       GROUP BY p.id,b.id,up.display_name ORDER BY p.created_at DESC`,
      [req.params.userId, !!req.realOnly],
    );
    res.set('Cache-Control', 'private, no-store');
    res.json({ partnerships: rows });
  } catch (error) {
    logger.error({ err: error }, 'Failed to load profile storefront partnerships');
    res.status(500).json({ error: 'Failed to fetch profile storefronts' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { business_id, profile_owner_id, commission_rate, ends_at } = req.body as Record<string, unknown>;
  const productIds = Array.isArray(req.body?.product_ids)
    ? [...new Set((req.body.product_ids as unknown[]).filter((id): id is string => typeof id === 'string'))]
    : [];
  const rate = Number(commission_rate);
  const end = typeof ends_at === 'string' ? new Date(ends_at) : new Date(NaN);
  if (typeof business_id !== 'string' || typeof profile_owner_id !== 'string' || !UUID_RE.test(business_id) || !UUID_RE.test(profile_owner_id) || !Number.isFinite(rate) || rate <= 0 || rate > 50 || !Number.isFinite(end.getTime()) || end <= new Date() || end > new Date(Date.now() + 366 * 24 * 60 * 60 * 1000) || productIds.length === 0 || productIds.length > 100 || productIds.some(id => !UUID_RE.test(id))) {
    res.status(400).json({ error: 'Choose a business, profile owner, commission from 0.01–50%, at least one offering, and expiry within one year' }); return;
  }
  if (profile_owner_id === req.user!.id) { res.status(400).json({ error: 'A business owner cannot partner with their own profile' }); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: businesses } = await client.query('SELECT id,owner_id,business_name FROM businesses WHERE id=$1 FOR SHARE', [business_id]);
    if (!businesses.length || businesses[0].owner_id !== req.user!.id) { await client.query('ROLLBACK'); res.status(403).json({ error: 'You can only invite a profile owner from your own business' }); return; }
    const { rows: profiles } = await client.query('SELECT up.user_id FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE up.user_id=$1 AND COALESCE(u.is_seed,FALSE)=FALSE AND COALESCE(u.is_demo,FALSE)=FALSE', [profile_owner_id]);
    if (!profiles.length) { await client.query('ROLLBACK'); res.status(404).json({ error: 'Profile owner not found' }); return; }
    const { rows: products } = await client.query(
      `SELECT id FROM products WHERE business_id=$1 AND seller_id=$2 AND status='active' AND id=ANY($3::uuid[])`,
      [business_id, req.user!.id, productIds],
    );
    if (products.length !== productIds.length) { await client.query('ROLLBACK'); res.status(400).json({ error: 'One or more selected offerings are no longer available in this business' }); return; }
    const { rows: [partnership] } = await client.query(
      `INSERT INTO profile_partnerships (business_id,business_owner_id,profile_owner_id,commission_rate,ends_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [business_id, req.user!.id, profile_owner_id, rate / 100, end.toISOString()],
    );
    await client.query(
      `INSERT INTO profile_partnership_products (partnership_id,product_id) SELECT $1,unnest($2::uuid[])`,
      [partnership.id, productIds],
    );
    await client.query(
      `INSERT INTO notifications (user_id,type,title,body,link,is_read)
       VALUES ($1,'partnership','A business invited you to partner',$2,$3,FALSE)`,
      [profile_owner_id, `${String(businesses[0].business_name ?? 'A business')} offered you a commission storefront.`, `/profile/${profile_owner_id}`],
    );
    await client.query('COMMIT');
    res.status(201).json({ partnership });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    logger.error({ err: error }, 'Failed to create profile partnership');
    res.status(500).json({ error: 'Failed to create partnership' });
  } finally { client.release(); }
});

router.put('/:id/accept', requireAuth, async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `UPDATE profile_partnerships SET status='active',accepted_at=NOW(),starts_at=NOW()
      WHERE id=$1 AND profile_owner_id=$2 AND status='pending' AND ends_at>NOW() RETURNING *`,
    [req.params.id, req.user!.id],
  );
  if (!rows.length) { res.status(404).json({ error: 'Pending invitation not found or expired' }); return; }
  res.json({ partnership: rows[0] });
});

router.put('/:id/decline', requireAuth, async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `UPDATE profile_partnerships SET status='declined',ended_at=NOW()
      WHERE id=$1 AND profile_owner_id=$2 AND status='pending' RETURNING id`,
    [req.params.id, req.user!.id],
  );
  if (!rows.length) { res.status(404).json({ error: 'Pending invitation not found' }); return; }
  res.json({ success: true });
});

router.put('/:id/terminate', requireAuth, async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `UPDATE profile_partnerships SET status='terminated',ended_at=NOW()
      WHERE id=$1 AND status='active' AND (business_owner_id=$2 OR profile_owner_id=$2) RETURNING id`,
    [req.params.id, req.user!.id],
  );
  if (!rows.length) { res.status(404).json({ error: 'Active partnership not found' }); return; }
  res.json({ success: true });
});

router.get('/my-commissions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,o.product_title,o.currency,b.business_name,p.business_owner_id,
              COALESCE(a.adjustment_count,0)::int AS adjustment_count,
              COALESCE(a.adjustment_delta,0) AS adjustment_delta
         FROM profile_owner_commissions c
       JOIN orders o ON o.id=c.order_id JOIN profile_partnerships p ON p.id=c.partnership_id
       JOIN businesses b ON b.id=p.business_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS adjustment_count, SUM(amount_delta) AS adjustment_delta
           FROM profile_owner_commission_adjustments a WHERE a.commission_id=c.id
       ) a ON TRUE
       WHERE c.profile_owner_id=$1 OR p.business_owner_id=$1 ORDER BY c.created_at DESC LIMIT 100`,
      [req.user!.id],
    );
    const totals = rows.reduce((acc: { earnedByCurrency: Record<string, number>; paidByCurrency: Record<string, number> }, row: Record<string, unknown>) => {
      const currency = String(row.currency || 'ETB');
      const amount = Number(row.amount) || 0;
      if (row.status === 'earned') acc.earnedByCurrency[currency] = (acc.earnedByCurrency[currency] || 0) + amount;
      if (row.status === 'paid') acc.paidByCurrency[currency] = (acc.paidByCurrency[currency] || 0) + amount;
      return acc;
    }, { earnedByCurrency: {}, paidByCurrency: {} });
    res.json({ commissions: rows, totals });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch profile-owner commissions');
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

router.get('/payouts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,b.business_name,up.display_name AS profile_owner_name,
              COUNT(pi.commission_id)::int AS order_count
         FROM profile_owner_payouts p
         JOIN profile_partnerships a ON a.id=p.partnership_id
         JOIN businesses b ON b.id=a.business_id
         JOIN user_profiles up ON up.user_id=p.profile_owner_id
         LEFT JOIN profile_owner_payout_items pi ON pi.payout_id=p.id
        WHERE p.profile_owner_id=$1 OR p.business_owner_id=$1
        GROUP BY p.id,b.business_name,up.display_name
        ORDER BY p.paid_at DESC LIMIT 100`,
      [req.user!.id],
    );
    res.json({ payouts: rows });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch partnership payout history');
    res.status(500).json({ error: 'Failed to fetch payout history' });
  }
});

router.post('/:id/payouts', requireAuth, async (req: Request, res: Response) => {
  const commissionIds = Array.isArray(req.body?.commission_ids)
    ? [...new Set((req.body.commission_ids as unknown[]).filter((id): id is string => typeof id === 'string'))]
    : [];
  const reference = typeof req.body?.payment_reference === 'string' ? req.body.payment_reference.trim().slice(0, 200) : '';
  if (!UUID_RE.test(req.params.id) || commissionIds.length === 0 || commissionIds.length > 100 || commissionIds.some(id => !UUID_RE.test(id))) {
    res.status(400).json({ error: 'Select one or more eligible commissions for this partnership' }); return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: agreements } = await client.query(
      `SELECT id,profile_owner_id,business_owner_id FROM profile_partnerships WHERE id=$1 FOR UPDATE`,
      [req.params.id],
    );
    const agreement = agreements[0];
    if (!agreement || agreement.business_owner_id !== req.user!.id) {
      await client.query('ROLLBACK'); res.status(404).json({ error: 'Partnership not found' }); return;
    }
    const { rows: commissions } = await client.query(
      `SELECT id,amount,currency FROM profile_owner_commissions
        WHERE id=ANY($1::uuid[]) AND partnership_id=$2 AND business_owner_id=$3
          AND profile_owner_id=$4 AND status='earned' FOR UPDATE`,
      [commissionIds, agreement.id, req.user!.id, agreement.profile_owner_id],
    );
    if (commissions.length !== commissionIds.length || commissions.some((row: Record<string, unknown>) => Number(row.amount) <= 0) || new Set(commissions.map((row: Record<string, unknown>) => String(row.currency || 'ETB'))).size > 1) {
      await client.query('ROLLBACK'); res.status(409).json({ error: 'Some selected commissions are no longer eligible or use different currencies' }); return;
    }
    const currency = String(commissions[0].currency || 'ETB');
    const amount = commissions.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.amount), 0);
    const { rows: [payout] } = await client.query(
      `INSERT INTO profile_owner_payouts (partnership_id,profile_owner_id,business_owner_id,currency,amount,payment_reference,recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$3) RETURNING *`,
      [agreement.id, agreement.profile_owner_id, req.user!.id, currency, amount, reference || null],
    );
    for (const row of commissions) {
      await client.query(`INSERT INTO profile_owner_payout_items (payout_id,commission_id,amount) VALUES ($1,$2,$3)`, [payout.id, row.id, row.amount]);
    }
    await client.query(`UPDATE profile_owner_commissions SET status='paid',updated_at=NOW() WHERE id=ANY($1::uuid[]) AND status='earned'`, [commissionIds]);
    await client.query('COMMIT');
    res.status(201).json({ payout });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    logger.error({ err: error }, 'Failed to record partnership payout');
    res.status(500).json({ error: 'Failed to record payout' });
  } finally { client.release(); }
});

module.exports = router;
module.exports.resolvePartnerAttribution = resolvePartnerAttribution;
module.exports.recordProfileOwnerCommission = recordProfileOwnerCommission;
