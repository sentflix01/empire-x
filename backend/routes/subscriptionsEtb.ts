/**
 * routes/subscriptionsEtb.ts — Prepaid ETB subscriptions through Chapa (Phase 1).
 *
 * Mounted on /api/subscriptions next to routes/subscriptions.ts (Stripe, USD).
 * Business rules live in lib/subscriptionPayments.ts and lib/subscriptionBilling.ts.
 *
 *   GET  /quote                     price for plan + months (owner)
 *   POST /checkout                  start a Chapa checkout (owner)
 *   POST /webhook/chapa             Chapa webhook (signed; raw body from index.ts)
 *   GET  /chapa/callback            Chapa callback_url
 *   GET  /payments                  billing history (owner)
 *   GET  /payments/:ref/status      confirm and report one payment (owner; return page polls it)
 *   GET  /payments/:id/receipt      receipt data (owner)
 *   GET  /chapa/sandbox, POST /chapa/sandbox/pay   fake checkout, never in production
 */
import express, { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import logger from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import { requireIsolatedPaymentEnvironment } from '../middleware/demoEnvironment';
import { getPrimaryFrontendUrl } from '../lib/frontendUrl';
import { isPaidTier, planForTier } from '../lib/subscriptionBilling';
import { isChapaConfigured, isChapaSandbox, isValidWebhookSignature, sandboxConfirm } from '../lib/chapaClient';
import { CheckoutError, confirmPayment, paymentHistory, previewCheckout, startCheckout } from '../lib/subscriptionPayments';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ownerOnly = [requireAuth, requireIsolatedPaymentEnvironment];

function sendError(res: Response, err: unknown, fallback: string): void {
  if (err instanceof CheckoutError) {
    res.status(err.status).json({ error: err.code, message: err.message, ...err.details });
    return;
  }
  logger.error({ err: (err as Error).message }, fallback);
  res.status(500).json({ error: 'server_error', message: fallback });
}

/** The caller's business: the requested one if they own it, or their only one. */
async function ownedBusinessId(req: Request, res: Response, requested: unknown): Promise<string | null> {
  const requestedId = typeof requested === 'string' && UUID.test(requested) ? requested : undefined;
  if (requestedId) {
    const { rows } = await pool.query('SELECT id FROM businesses WHERE id = $1 AND owner_id = $2', [requestedId, req.user!.id]);
    if (rows[0]) return rows[0].id;
    res.status(404).json({ error: 'business_not_found', message: 'Business profile not found.' });
    return null;
  }
  const { rows } = await pool.query('SELECT id FROM businesses WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 2', [req.user!.id]);
  if (rows.length === 1) return rows[0].id;
  if (rows.length > 1) res.status(409).json({ error: 'business_selection_required', message: 'Choose which Business profile this payment is for.' });
  else res.status(409).json({ error: 'business_profile_required', message: 'Create a Business profile before choosing a plan.' });
  return null;
}

router.get('/quote', ...ownerOnly, async (req: Request, res: Response) => {
  try {
    const businessId = await ownedBusinessId(req, res, req.query.businessId);
    if (!businessId) return;
    const q = await previewCheckout(businessId, req.query.plan, req.query.months ?? 1);
    res.json({ ...q, currency: 'ETB', businessId });
  } catch (err) { sendError(res, err, 'Could not price this plan'); }
});

router.post('/checkout', ...ownerOnly, async (req: Request, res: Response) => {
  if (!isChapaConfigured()) {
    res.status(503).json({ error: 'etb_checkout_unavailable', message: 'ETB payments are not available yet. Please try again later.' });
    return;
  }
  try {
    const businessId = await ownedBusinessId(req, res, req.body?.business_id);
    if (!businessId) return;
    const draftId = typeof req.body?.draft_id === 'string' && UUID.test(req.body.draft_id) ? req.body.draft_id : null;
    const { checkoutUrl, txRef, quote } = await startCheckout({
      userId: req.user!.id, businessId, tier: req.body?.plan, months: req.body?.months ?? 1, draftId,
    });
    res.json({ checkout_url: checkoutUrl, tx_ref: txRef, amount: quote.amount, currency: 'ETB', kind: quote.kind, period_end: quote.periodEnd });
  } catch (err) { sendError(res, err, 'Could not start the payment'); }
});

// Chapa's webhook. The signature proves the sender; confirmPayment still re-verifies with Chapa.
router.post('/webhook/chapa', async (req: Request, res: Response) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  if (!isValidWebhookSignature(raw, req.headers as Record<string, unknown>)) {
    res.status(401).json({ error: 'invalid_signature' });
    return;
  }
  let txRef: unknown;
  try {
    const event = JSON.parse(raw.toString('utf8'));
    txRef = event?.tx_ref ?? event?.trx_ref;
  } catch { /* not JSON: ignored below */ }
  // Order payments and other events are not ours.
  if (typeof txRef !== 'string' || !txRef.startsWith('nbsub-')) { res.json({ received: true, ignored: true }); return; }
  try {
    const { outcome } = await confirmPayment(txRef);
    res.json({ received: true, outcome });
  } catch (err) {
    logger.error({ err: (err as Error).message, txRef }, 'Chapa subscription webhook failed');
    res.status(500).json({ error: 'processing_failed' }); // Chapa retries
  }
});

// Chapa also calls the checkout's callback_url. Treated as a hint: confirmPayment re-verifies.
router.get('/chapa/callback', async (req: Request, res: Response) => {
  const ref = req.query.tx_ref ?? req.query.trx_ref;
  const txRef = typeof ref === 'string' ? ref : '';
  if (!txRef.startsWith('nbsub-')) { res.status(400).json({ error: 'invalid_reference' }); return; }
  try {
    const { outcome } = await confirmPayment(txRef);
    res.json({ outcome });
  } catch (err) {
    logger.error({ err: (err as Error).message, txRef }, 'Chapa subscription callback failed');
    res.status(500).json({ error: 'processing_failed' });
  }
});

async function ownedPayment(ownerId: string, column: 'provider_ref' | 'id', value: string) {
  const { rows } = await pool.query(
    `SELECT sp.*, b.business_name FROM subscription_payments sp JOIN businesses b ON b.id = sp.business_id
      WHERE sp.${column} = $1 AND b.owner_id = $2`,
    [value, ownerId],
  );
  return rows[0] ?? null;
}

router.get('/payments', ...ownerOnly, async (req: Request, res: Response) => {
  try {
    const businessId = await ownedBusinessId(req, res, req.query.businessId);
    if (!businessId) return;
    res.set('Cache-Control', 'private, no-store');
    res.json({ businessId, payments: await paymentHistory(businessId) });
  } catch (err) { sendError(res, err, 'Could not load billing history'); }
});

// The return page polls this. It re-verifies with Chapa, so a delayed webhook never blocks activation.
router.get('/payments/:ref/status', ...ownerOnly, async (req: Request, res: Response) => {
  try {
    const payment = await ownedPayment(req.user!.id, 'provider_ref', req.params.ref);
    if (!payment) { res.status(404).json({ error: 'payment_not_found' }); return; }
    const outcome = payment.status === 'paid' ? 'already_paid' : (await confirmPayment(req.params.ref)).outcome;
    const fresh = await ownedPayment(req.user!.id, 'provider_ref', req.params.ref);
    res.set('Cache-Control', 'private, no-store');
    res.json({
      outcome, status: fresh.status, amount: fresh.amount, currency: fresh.currency, tier: fresh.tier,
      months: fresh.months, kind: fresh.kind, receipt_number: fresh.receipt_number, period_end: fresh.period_end,
      business_id: fresh.business_id, payment_id: fresh.id, draft_id: fresh.draft_id,
    });
  } catch (err) { sendError(res, err, 'Could not check this payment'); }
});

router.get('/payments/:id/receipt', ...ownerOnly, async (req: Request, res: Response) => {
  try {
    if (!UUID.test(req.params.id)) { res.status(404).json({ error: 'receipt_not_found' }); return; }
    const p = await ownedPayment(req.user!.id, 'id', req.params.id);
    if (!p || p.status !== 'paid') { res.status(404).json({ error: 'receipt_not_found' }); return; }
    res.set('Cache-Control', 'private, no-store');
    res.json({
      receipt_number: p.receipt_number, business_name: p.business_name, business_id: p.business_id,
      plan: isPaidTier(p.tier) ? planForTier(p.tier).label : p.tier, tier: p.tier, kind: p.kind, months: p.months,
      amount: p.amount, currency: p.currency, provider: p.provider, provider_ref: p.provider_ref,
      paid_at: p.paid_at, period_start: p.period_start, period_end: p.period_end,
    });
  } catch (err) { sendError(res, err, 'Could not load this receipt'); }
});

// ── Chapa sandbox: local development and tests only, 404 in production ──────
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

router.get('/chapa/sandbox', async (req: Request, res: Response) => {
  if (!isChapaSandbox()) { res.status(404).json({ error: 'Not found' }); return; }
  const txRef = String(req.query.tx_ref ?? '');
  const { rows: [p] } = await pool.query('SELECT amount FROM subscription_payments WHERE provider_ref = $1', [txRef]);
  if (!p) { res.status(404).send('Unknown payment'); return; }
  const returnUrl = String(req.query.return_url ?? '');
  res.set('Content-Type', 'text/html; charset=utf-8').send(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chapa sandbox</title></head>'
    + '<body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px;text-align:center">'
    + `<h1>Chapa sandbox</h1><p>No real money moves.</p><p><strong>ETB ${escapeHtml(String(p.amount))}</strong></p>`
    + '<form method="post" action="/api/subscriptions/chapa/sandbox/pay">'
    + `<input type="hidden" name="tx_ref" value="${escapeHtml(txRef)}"><input type="hidden" name="return_url" value="${escapeHtml(returnUrl)}">`
    + '<button style="background:#16a34a;color:#fff;border:0;border-radius:8px;padding:12px 24px;font-size:16px">Pay with test telebirr</button>'
    + '</form></body></html>',
  );
});

router.post('/chapa/sandbox/pay', express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
  if (!isChapaSandbox()) { res.status(404).json({ error: 'Not found' }); return; }
  const txRef = String(req.body?.tx_ref ?? '');
  const { rows: [p] } = await pool.query('SELECT amount FROM subscription_payments WHERE provider_ref = $1', [txRef]);
  if (!p) { res.status(404).send('Unknown payment'); return; }
  sandboxConfirm(txRef, Number(p.amount));
  const frontend = getPrimaryFrontendUrl();
  const returnUrl = String(req.body?.return_url ?? '');
  res.redirect(303, returnUrl.startsWith(`${frontend}/`) ? returnUrl : `${frontend}/business/subscription`);
});

module.exports = router;
