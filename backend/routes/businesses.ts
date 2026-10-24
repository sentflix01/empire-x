import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import { cacheMiddleware } from '../middleware/cache';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord, withoutProtectedFields } from '../utils/crud';
import { getBusinessSubscriptionAccess, isBusinessOwnerBlocked } from '../lib/businessSubscriptionPolicy';
import pool from '../db/pool';
import { redactContactFields, parsePublicContactFields } from '../lib/contactPrivacy';
import { businessViewGate, isBusinessVisibility, rejectViewGate } from '../lib/siteVisibility';

const canSeeAll = (req: Request, ownerId: unknown) => !!req.user && (req.user.id === ownerId || req.user.role === 'admin');

/** Validates owner-editable privacy fields; returns an error message or null. */
function privacyFieldError(updates: Record<string, unknown>): string | null {
  if (updates.public_contact_fields !== undefined) {
    const parsed = parsePublicContactFields(updates.public_contact_fields);
    if (!parsed) return 'public_contact_fields must list only business_contact_phone, business_contact_email or business_address';
    updates.public_contact_fields = parsed;
  }
  if (updates.visibility !== undefined && !isBusinessVisibility(updates.visibility)) {
    return "visibility must be 'public' or 'private'";
  }
  if (updates.pickup_address !== undefined && updates.pickup_address !== null && (typeof updates.pickup_address !== 'string' || updates.pickup_address.length > 500)) {
    return 'pickup_address must be text of at most 500 characters';
  }
  return null;
}

const router = Router();

router.get('/', optionalAuth, cacheMiddleware('businesses:list', 30, { varyByAuth: true }), async (req: Request, res: Response) => {
  try {
    const { owner_id, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, string> = {};
    if (owner_id) filter.owner_id = owner_id;
    if (owner_id && req.user?.id === owner_id && await isBusinessOwnerBlocked(owner_id)) {
      res.status(423).json({ error: 'business_profile_blocked', message: 'This business profile is blocked until its subscription is renewed.' });
      return;
    }
    const rows = await listRecords('businesses', {
      filter, sort, limit, realOnly: req.realOnly,
      paidBusinessGrace: !owner_id || owner_id !== req.user?.id,
      publicOnly: !req.user,
    }) as Array<Record<string, unknown>>;
    res.json(rows.map((row) => redactContactFields(row, canSeeAll(req, row.owner_id))));
  } catch { res.status(500).json({ error: 'Failed to fetch businesses' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const biz = await getRecord('businesses', req.params.id, { realOnly: req.realOnly });
    if (!biz) { res.status(404).json({ error: 'Business not found' }); return; }
    const ownerId = String((biz as Record<string, unknown>).owner_id ?? '');
    const access = await getBusinessSubscriptionAccess(req.params.id);
    const isOwner = req.user?.id === ownerId;
    if (!isOwner && rejectViewGate(res, businessViewGate(access, req), 'Business not found')) return;
    res.json(redactContactFields(biz as Record<string, unknown>, canSeeAll(req, ownerId)));
  } catch { res.status(500).json({ error: 'Failed to fetch business' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    if (await isBusinessOwnerBlocked(req.user!.id)) {
      res.status(423).json({ error: 'business_creation_blocked', message: 'You can create a new business profile after the restriction period ends.' });
      return;
    }
    const { business_name, business_category } = req.body as Record<string, string>;
    if (!business_name || !business_category) {
      res.status(400).json({ error: 'business_name and business_category are required' }); return;
    }
    const fields = withoutProtectedFields(req.body as Record<string, unknown>, 'owner_id');
    const privacyError = privacyFieldError(fields);
    if (privacyError) { res.status(422).json({ error: privacyError }); return; }
    const biz = await createRecord('businesses', { ...fields, owner_id: req.user!.id });
    res.status(201).json(biz);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create business error');
    res.status(500).json({ error: 'Failed to create business' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ owner_id: string }>('businesses', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Business not found' }); return; }
    if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const updates = withoutProtectedFields(req.body as Record<string, unknown>, 'owner_id');
    if (!Object.keys(updates).length) { res.status(400).json({ error: 'No updatable business fields provided' }); return; }
    const privacyError = privacyFieldError(updates);
    if (privacyError) { res.status(422).json({ error: privacyError }); return; }
    res.json(await updateRecord('businesses', req.params.id, updates));
  } catch { res.status(500).json({ error: 'Failed to update business' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ owner_id: string }>('businesses', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Business not found' }); return; }
    if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('businesses', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete business' }); }
});

// ── Seller payment accounts (buyers pay sellers directly; decision §2) ───────

const PAYMENT_METHODS = ['bank', 'mobile_money', 'other'];
const MAX_PAYMENT_ACCOUNTS = 10;
const PAYMENT_ACCOUNT_COLUMNS = 'id, business_id, method, provider_name, account_name, account_number, instructions, is_active, sort_order, created_at, updated_at';

/** Loads the business and checks the caller may manage it; sends the error response otherwise. */
async function loadManagedBusiness(req: Request, res: Response): Promise<Record<string, unknown> | null> {
  const biz = await getRecord<Record<string, unknown>>('businesses', req.params.id);
  if (!biz) { res.status(404).json({ error: 'Business not found' }); return null; }
  if (biz.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return null; }
  return biz;
}

function paymentAccountInput(body: Record<string, unknown>, partial: boolean): { values: Record<string, unknown> } | { error: string } {
  const values: Record<string, unknown> = {};
  const text = (key: string, max: number, required: boolean) => {
    const raw = body[key];
    if (raw === undefined) {
      if (required && !partial) throw new Error(`${key} is required`);
      return;
    }
    if (raw === null && !required) { values[key] = null; return; }
    if (typeof raw !== 'string' || !raw.trim() || raw.trim().length > max) throw new Error(`${key} must be 1-${max} characters`);
    values[key] = raw.trim();
  };
  try {
    if (body.method !== undefined || !partial) {
      if (!PAYMENT_METHODS.includes(String(body.method))) throw new Error('method must be bank, mobile_money or other');
      values.method = body.method;
    }
    text('provider_name', 80, true);
    text('account_name', 120, true);
    text('account_number', 60, true);
    text('instructions', 500, false);
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') throw new Error('is_active must be true or false');
      values.is_active = body.is_active;
    }
    if (body.sort_order !== undefined) {
      if (!Number.isInteger(body.sort_order)) throw new Error('sort_order must be an integer');
      values.sort_order = body.sort_order;
    }
  } catch (err) { return { error: (err as Error).message }; }
  return { values };
}

router.get('/:id/payment-accounts', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!await loadManagedBusiness(req, res)) return;
    const { rows } = await pool.query(`SELECT ${PAYMENT_ACCOUNT_COLUMNS} FROM business_payment_accounts WHERE business_id=$1 ORDER BY sort_order, created_at`, [req.params.id]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to load payment accounts' }); }
});

router.post('/:id/payment-accounts', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!await loadManagedBusiness(req, res)) return;
    const parsed = paymentAccountInput(req.body as Record<string, unknown>, false);
    if ('error' in parsed) { res.status(422).json({ error: parsed.error }); return; }
    const { rows: count } = await pool.query('SELECT COUNT(*)::int AS n FROM business_payment_accounts WHERE business_id=$1', [req.params.id]);
    if ((count[0]?.n ?? 0) >= MAX_PAYMENT_ACCOUNTS) { res.status(422).json({ error: `A business can list at most ${MAX_PAYMENT_ACCOUNTS} payment accounts` }); return; }
    const v = parsed.values;
    const { rows } = await pool.query(
      `INSERT INTO business_payment_accounts (business_id, method, provider_name, account_name, account_number, instructions, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${PAYMENT_ACCOUNT_COLUMNS}`,
      [req.params.id, v.method, v.provider_name, v.account_name, v.account_number, v.instructions ?? null, v.is_active ?? true, v.sort_order ?? 0],
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to add payment account' }); }
});

router.put('/:id/payment-accounts/:accountId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!await loadManagedBusiness(req, res)) return;
    const parsed = paymentAccountInput(req.body as Record<string, unknown>, true);
    if ('error' in parsed) { res.status(422).json({ error: parsed.error }); return; }
    const entries = Object.entries(parsed.values);
    if (!entries.length) { res.status(422).json({ error: 'No updatable fields provided' }); return; }
    // Keys come from paymentAccountInput's fixed list, never from the request.
    const sets = entries.map(([key], i) => `${key}=$${i + 3}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE business_payment_accounts SET ${sets}, updated_at=NOW() WHERE id=$1 AND business_id=$2 RETURNING ${PAYMENT_ACCOUNT_COLUMNS}`,
      [req.params.accountId, req.params.id, ...entries.map(([, value]) => value)],
    );
    if (!rows.length) { res.status(404).json({ error: 'Payment account not found' }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to update payment account' }); }
});

router.delete('/:id/payment-accounts/:accountId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!await loadManagedBusiness(req, res)) return;
    const { rowCount } = await pool.query('DELETE FROM business_payment_accounts WHERE id=$1 AND business_id=$2', [req.params.accountId, req.params.id]);
    if (!rowCount) { res.status(404).json({ error: 'Payment account not found' }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete payment account' }); }
});

/**
 * Public seller details for the Buy view: business identity, the contact fields
 * the owner made public, and active payment accounts. Never the pickup address.
 */
router.get('/:id/checkout-info', optionalAuth, async (req: Request, res: Response) => {
  try {
    const biz = await getRecord<Record<string, unknown>>('businesses', req.params.id, { realOnly: req.realOnly });
    if (!biz) { res.status(404).json({ error: 'Business not found' }); return; }
    const access = await getBusinessSubscriptionAccess(req.params.id);
    if (!canSeeAll(req, biz.owner_id) && rejectViewGate(res, businessViewGate(access, req), 'Business not found')) return;
    const visible = redactContactFields(biz, false);
    const { rows: accounts } = await pool.query(
      `SELECT id, method, provider_name, account_name, account_number, instructions FROM business_payment_accounts
        WHERE business_id=$1 AND is_active=TRUE ORDER BY sort_order, created_at`,
      [req.params.id],
    );
    res.json({
      business: {
        id: biz.id,
        owner_id: biz.owner_id,
        business_name: biz.business_name,
        business_category: biz.business_category,
        business_logo_url: biz.business_logo_url ?? null,
        business_contact_phone: visible.business_contact_phone ?? null,
        business_contact_email: visible.business_contact_email ?? null,
        business_address: visible.business_address ?? null,
      },
      payment_accounts: accounts,
      // Integrated providers that settle straight to the seller arrive in Phase 2.
      payment_options: { direct: accounts.length > 0, providers: [] as string[] },
    });
  } catch { res.status(500).json({ error: 'Failed to load checkout details' }); }
});

module.exports = router;
