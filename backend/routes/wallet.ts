/**
 * routes/wallet.ts — Wallet management
 *
 * atomicWalletOp: SELECT...FOR UPDATE inside BEGIN/COMMIT prevents
 * concurrent balance corruption (Phase 1 Task 4).
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { isStripeConfigured, stripeClientFacade } from '../lib/stripeClient';
import * as apiError from '../lib/apiError';
import { getPrimaryFrontendUrl } from '../lib/frontendUrl';
import { recordEvent } from '../lib/telemetry';
import { auditLog } from '../lib/auditLogger';
import { requireIsolatedPaymentEnvironment } from '../middleware/demoEnvironment';
import { requireFeatureFlag } from '../middleware/featureFlag';

const router = Router();

// ── atomicWalletOp ────────────────────────────────────────────────────────────
const CREDIT_TYPES = new Set(['credit', 'refund', 'pending_topup']);

export async function atomicWalletOp(
  userId: string,
  type: string,
  amount: number,
  description: string,
  reference: string | null = null,
  auditContext: { actor_id?: string; actor_email?: string; ip?: string; ua?: string } = {},
): Promise<{ wallet: Record<string,unknown>; transaction: Record<string,unknown> }> {
  const delta = CREDIT_TYPES.has(type) ? amount : -amount;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: wallets } = await client.query('SELECT * FROM wallets WHERE user_id=$1', [userId]);
    if (!wallets.length) {
      await client.query('INSERT INTO wallets (user_id) VALUES ($1)', [userId]);
    }
    const { rows: locked } = await client.query('SELECT id, balance FROM wallets WHERE user_id=$1 FOR UPDATE', [userId]);
    if (!locked.length) throw Object.assign(new Error('Wallet not found'), { code: 'WALLET_NOT_FOUND' });
    const current = parseFloat(locked[0].balance as string);
    const newBalance = Math.round((current + delta) * 100) / 100;
    if (newBalance < 0) throw Object.assign(new Error(`Insufficient balance: have ${current}, need ${amount}`), { code: 'INSUFFICIENT_BALANCE' });
    const { rows: [updated] } = await client.query('UPDATE wallets SET balance=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [newBalance, locked[0].id]);
    const { rows: [tx] } = await client.query(`INSERT INTO wallet_transactions (wallet_id,type,amount,description,reference) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [locked[0].id, type, amount, description, reference]);

    // Audit log — captures every wallet mutation (topup, debit, refund, withdrawal)
    auditLog({
      actor_id: auditContext.actor_id ?? userId,
      actor_email: auditContext.actor_email ?? null,
      action: type,
      entity_type: 'wallet',
      entity_id: locked[0].id as string,
      amount,
      balance_before: current,
      balance_after: newBalance,
      metadata: { description, reference, target_user: userId },
      ip_address: auditContext.ip ?? null,
      user_agent: auditContext.ua ?? null,
    }).catch(() => {}); // fire-and-forget — never block the transaction

    await client.query('COMMIT');
    return { wallet: updated as Record<string,unknown>, transaction: tx as Record<string,unknown> };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (rollbackErr) {
      // The connection may already be dead — never mask the original error.
      logger.warn({ err: (rollbackErr as Error).message }, 'atomicWalletOp: ROLLBACK failed');
    }
    throw err;
  } finally {
    client.release();
  }
}

async function getOrCreateWallet(userId: string): Promise<Record<string,unknown>> {
  const { rows } = await pool.query('SELECT * FROM wallets WHERE user_id=$1', [userId]);
  if (rows.length) return rows[0] as Record<string,unknown>;
  const { rows: created } = await pool.query('INSERT INTO wallets (user_id) VALUES ($1) RETURNING *', [userId]);
  return created[0] as Record<string,unknown>;
}

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const wallet = await getOrCreateWallet(req.user!.id);
    const { rows: txs } = await pool.query('SELECT * FROM wallet_transactions WHERE wallet_id=$1 ORDER BY created_at DESC LIMIT 50', [wallet.id]);
    res.json({ ...wallet, transactions: txs });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch wallet');
    apiError.serverError(res, 'Failed to fetch wallet');
  }
});

router.post('/topup', requireAuth, async (req: Request, res: Response) => {
  if (process.env.NODE_ENV==='production' && req.user!.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const { amount, reference } = req.body as { amount?: number; reference?: string };
  if (!amount || amount <= 0) { apiError.validationError(res, 'Valid amount is required'); return; }
  try {
    const { wallet } = await atomicWalletOp(req.user!.id, 'credit', parseFloat(String(amount)), 'Wallet top-up', reference ?? null, { actor_id: req.user!.id, actor_email: req.user!.email, ip: req.ip, ua: req.get('user-agent') });
    res.json(wallet);
  } catch (err) {
    logger.error({ err }, 'Failed to top up wallet');
    apiError.serverError(res, 'Failed to top up wallet');
  }
});

router.post('/withdraw', requireAuth, requireIsolatedPaymentEnvironment, async (req: Request, res: Response) => {
  const { amount, bank_name, account_number } = req.body as Record<string,unknown>;
  if (!amount || Number(amount) <= 0) { apiError.validationError(res, 'Valid amount is required'); return; }
  try {
    const { wallet } = await atomicWalletOp(req.user!.id, 'withdrawal', parseFloat(String(amount)), `Withdrawal to ${bank_name ?? 'bank'} ${account_number ?? ''}`.trim(), null, { actor_id: req.user!.id, actor_email: req.user!.email, ip: req.ip, ua: req.get('user-agent') });
    pool.query(`INSERT INTO notifications (user_id,type,title,body) SELECT id,'order','Withdrawal Request',$1 FROM users WHERE role='admin' LIMIT 1`, [`User ${req.user!.id} requested withdrawal of ${amount} ETB`]).catch(()=>undefined);
    res.json({ success: true, message: 'Withdrawal request submitted. Processing within 1-3 business days.', wallet });
  } catch (err) {
    if ((err as {code?:string}).code === 'INSUFFICIENT_BALANCE') { apiError.validationError(res, 'Insufficient balance'); return; }
    apiError.serverError(res, 'Failed to process withdrawal');
  }
});

router.post('/debit', requireAuth, async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
  const { user_id, amount, description, reference } = req.body as Record<string,unknown>;
  if (!user_id || !amount || Number(amount) <= 0) { apiError.validationError(res, 'user_id and a positive amount are required'); return; }
  try {
    const { wallet } = await atomicWalletOp(String(user_id), 'debit', parseFloat(String(amount)), String(description ?? 'Debit'), String(reference ?? null) === 'null' ? null : String(reference ?? null), { actor_id: req.user!.id, actor_email: req.user!.email, ip: req.ip, ua: req.get('user-agent') });
    res.json(wallet);
  } catch (err) {
    if ((err as {code?:string}).code === 'INSUFFICIENT_BALANCE') { apiError.validationError(res, 'Insufficient balance'); return; }
    apiError.serverError(res, 'Failed to process debit');
  }
});

router.post('/refund', requireAuth, async (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const { user_id, amount, description, reference } = req.body as Record<string,unknown>;
  if (!user_id || !amount || Number(amount) <= 0) { apiError.validationError(res, 'user_id and a positive amount are required'); return; }
  try {
    const { wallet } = await atomicWalletOp(String(user_id), 'refund', parseFloat(String(amount)), String(description ?? 'Refund'), String(reference ?? null) === 'null' ? null : String(reference ?? null), { actor_id: req.user!.id, actor_email: req.user!.email, ip: req.ip, ua: req.get('user-agent') });
    res.json(wallet);
  } catch (err) {
    logger.error({ err }, 'Failed to process refund');
    apiError.serverError(res, 'Failed to process refund');
  }
});

// ── Chapa Top-up ──────────────────────────────────────────────────────────────

router.post('/topup/chapa', requireAuth, requireIsolatedPaymentEnvironment, requireFeatureFlag('chapa_payments', 'Chapa payments temporarily disabled'), async (req: Request, res: Response) => {
  const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY ?? null;
  const SANDBOX = CHAPA_SECRET === 'SANDBOX';
  if (!CHAPA_SECRET) { res.status(503).json({ error: 'Chapa payments not configured. Add CHAPA_SECRET_KEY.' }); return; }
  if (SANDBOX && process.env.NODE_ENV === 'production') { res.status(503).json({ error: 'Chapa sandbox is disabled in production' }); return; }
  const { amount, email, first_name, last_name, phone_number } = req.body as Record<string,unknown>;
  if (!amount || Number(amount) <= 0) { apiError.validationError(res, 'Valid amount is required'); return; }
  const tx_ref = `empx-wallet-${req.user!.id.slice(0,8)}-${Date.now()}`;
  const frontendUrl = getPrimaryFrontendUrl();
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  try {
    let checkout_url: string;
    if (SANDBOX) {
      const returnUrl = `${frontendUrl}/wallet?topup=success&tx_ref=${tx_ref}`;
      const verifyUrl = `${apiUrl}/api/wallet/topup/chapa/verify/${tx_ref}`;
      checkout_url = `${apiUrl}/api/wallet/topup/chapa/sandbox?tx_ref=${tx_ref}&amount=${amount}&return_url=${encodeURIComponent(returnUrl)}&verify_url=${encodeURIComponent(verifyUrl)}`;
    } else {
      const { default: nodeFetch } = await import('node-fetch');
      const chapaRes = await nodeFetch('https://api.chapa.co/v1/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${CHAPA_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: String(amount), currency: 'ETB', email: email ?? req.user!.email, first_name: first_name ?? 'User', last_name: last_name ?? '', phone_number: phone_number ?? '', tx_ref, callback_url: `${apiUrl}/api/wallet/topup/chapa/verify/${tx_ref}`, return_url: `${frontendUrl}/wallet?topup=success&tx_ref=${tx_ref}` }),
      }).then(r => r.json()) as Record<string,unknown>;
      if (chapaRes.status !== 'success') { res.status(502).json({ error: (chapaRes.message as string) ?? 'Chapa error', detail: chapaRes }); return; }
      checkout_url = (chapaRes.data as Record<string,string>).checkout_url;
    }
    const wallet = await getOrCreateWallet(req.user!.id);
    await pool.query(`INSERT INTO wallet_transactions (wallet_id,type,amount,description,reference) VALUES ($1,'pending_topup',$2,'Chapa wallet top-up (pending)',$3)`, [wallet.id, amount, tx_ref]);
    res.json({ checkout_url, tx_ref });
  } catch (err) {
    logger.error({ err }, 'Chapa wallet topup error');
    apiError.serverError(res, 'Failed to initialize Chapa top-up');
  }
});

// Sandbox page — dev/test only. A fake payment confirmation surface must
// never be reachable in production, even if a sandbox secret leaks.
router.get('/topup/chapa/sandbox', (req: Request, res: Response) => {
  const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY ?? null;
  const SANDBOX = CHAPA_SECRET === 'SANDBOX';
  if (!SANDBOX || process.env.NODE_ENV === 'production') { res.status(404).json({ error: 'Not found' }); return; }
  const { tx_ref, amount, return_url, verify_url } = req.query as Record<string,string>;
  const safe = (s: string) => String(s||'').replace(/[<>"'&]/g, c=>`&#${c.charCodeAt(0)};`);
  const safeReturn = return_url ? decodeURIComponent(return_url) : getPrimaryFrontendUrl();
  const safeVerify = verify_url ? decodeURIComponent(verify_url) : '';
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Chapa Sandbox</title></head><body style="font-family:sans-serif;text-align:center;padding:2rem"><h1>🇪🇹 Chapa Sandbox</h1><p>Amount: <strong>${safe(amount)} ETB</strong></p><p>ref: ${safe(tx_ref)}</p><button onclick="pay()" style="background:#16a34a;color:#fff;padding:1rem 2rem;border:none;border-radius:8px;cursor:pointer;font-size:1rem">✅ Confirm Payment</button><p style="color:#999;font-size:.8rem">Sandbox — no real money</p><script>async function pay(){try{if('${safeVerify}')await fetch('${safeVerify}');}catch(e){}window.location.href='${safeReturn}';}</script></body></html>`);
});

// Chapa verify (callback + polling endpoint)
// Concurrency-safe: the pending_topup row is claimed transactionally, so two
// simultaneous callbacks can never double-credit the same top-up.
router.get('/topup/chapa/verify/:tx_ref', async (req: Request, res: Response) => {
  const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY ?? null;
  const SANDBOX = CHAPA_SECRET === 'SANDBOX';
  const { tx_ref } = req.params;
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3002';
  if (!CHAPA_SECRET) { res.status(503).json({ error: 'Chapa not configured' }); return; }
  if (SANDBOX && process.env.NODE_ENV === 'production') { res.status(404).json({ error: 'Not found' }); return; }
  try {
    let paidAmount: number | null = null;
    if (!SANDBOX) {
      const { default: nodeFetch } = await import('node-fetch');
      const chapaRes = await nodeFetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(tx_ref)}`, { headers: { Authorization: `Bearer ${CHAPA_SECRET}` } }).then(r=>r.json()) as Record<string,unknown>;
      const ok = chapaRes.status==='success' && (chapaRes.data as Record<string,string>)?.status==='success';
      recordEvent('chapa_verify',{outcome:ok?'ok':'rejected',tx_ref},{level:ok?'info':'warn'});
      paidAmount = parseFloat((chapaRes.data as Record<string,string>)?.amount ?? '0');
      if (!ok) {
        await pool.query(`UPDATE wallet_transactions SET description='Chapa FAILED',type='failed_topup' WHERE reference=$1 AND type='pending_topup'`, [tx_ref]);
        if (req.headers.accept?.includes('text/html')) { res.redirect(`${frontendUrl}/wallet?topup=failed&tx_ref=${tx_ref}`); return; }
        apiError.validationError(res, 'Payment not successful'); return;
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Atomic claim — flips pending_topup → credit for exactly one caller.
      const { rows: claimed } = await client.query(
        `UPDATE wallet_transactions SET type='credit',description=$2 WHERE reference=$1 AND type='pending_topup' RETURNING id,wallet_id,amount`,
        [tx_ref, SANDBOX ? 'Chapa top-up (sandbox)' : 'Chapa top-up (confirmed)'],
      );
      if (!claimed.length) {
        await client.query('COMMIT');
        if (req.headers.accept?.includes('text/html')) { res.redirect(`${frontendUrl}/wallet?topup=success&tx_ref=${tx_ref}`); return; }
        res.json({ success: true, already_processed: true }); return;
      }
      const expected = parseFloat(String(claimed[0].amount));
      if (!Number.isFinite(expected) || expected <= 0) throw new Error(`Invalid pending top-up amount for ${tx_ref}`);
      if (!SANDBOX && paidAmount !== null && paidAmount + 0.01 < expected) {
        // Underpaid — do not credit; keep an auditable failed record.
        await client.query(`UPDATE wallet_transactions SET type='failed_topup',description=$2 WHERE id=$1`, [claimed[0].id, `Chapa underpaid: sent ${paidAmount}, expected ${expected}`]);
        await client.query('COMMIT');
        if (req.headers.accept?.includes('text/html')) { res.redirect(`${frontendUrl}/wallet?topup=failed&tx_ref=${tx_ref}`); return; }
        recordEvent('topup_underpaid',{tx_ref,expected,paid:paidAmount},{level:'error'});
        apiError.validationError(res, 'Payment amount does not match the requested top-up'); return;
      }
      // Credit the EXPECTED (server-recorded) amount — never a client- or
      // provider-reported figure that could exceed what was requested.
      await client.query('UPDATE wallets SET balance=balance+$1,updated_at=NOW() WHERE id=$2', [expected, claimed[0].wallet_id]);
      await client.query('COMMIT');
      if (req.headers.accept?.includes('text/html')) { res.redirect(`${frontendUrl}/wallet?topup=success&tx_ref=${tx_ref}`); return; }
      recordEvent('wallet_topup_credited',{tx_ref,amount:expected,provider:SANDBOX?'chapa-sandbox':'chapa'});
      res.json({ success: true, amount_credited: expected });
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (rollbackErr) {
        logger.warn({ err: (rollbackErr as Error).message }, 'chapa verify: ROLLBACK failed');
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, 'Chapa wallet verify error');
    apiError.serverError(res, 'Failed to verify Chapa top-up');
  }
});

// ── Stripe Top-up ─────────────────────────────────────────────────────────────

router.post('/topup/stripe', requireAuth, requireIsolatedPaymentEnvironment, requireFeatureFlag('stripe_payments', 'Stripe payments temporarily disabled'), async (req: Request, res: Response) => {
  const stripe = stripeClientFacade() as Record<string,unknown>;
  if (!isStripeConfigured()) { res.status(503).json({ error: 'Stripe is not configured for this environment' }); return; }
  const { amount } = req.body as { amount?: number };
  if (!amount || parseFloat(String(amount))<=0) { apiError.validationError(res, 'Valid amount is required'); return; }
  const amountEtb = Math.round(parseFloat(String(amount))*100)/100;
  const rate = (() => { const r=parseFloat(process.env.STRIPE_ETB_TO_USD_RATE??'0.008'); return Number.isFinite(r)&&r>0?r:0.008; })();
  let currency = (process.env.STRIPE_CURRENCY??'usd').toLowerCase();
  const toCents = (cur: string) => Math.round((cur==='usd'?amountEtb*rate:amountEtb)*100);
  const frontendUrl = getPrimaryFrontendUrl();
  try {
    const wallet = await getOrCreateWallet(req.user!.id);
    const buildParams = (cur: string): Record<string,unknown> => ({
      mode: 'payment',
      line_items: [{ price_data: { currency: cur, product_data: { name: 'Nodbusiness Wallet Top-up' }, unit_amount: toCents(cur) }, quantity: 1 }],
      success_url: `${frontendUrl}/wallet?topup=success&provider=stripe`,
      cancel_url:  `${frontendUrl}/wallet?topup=cancelled`,
      metadata: { purpose: 'wallet_topup', user_id: req.user!.id, wallet_id: wallet.id, amount_etb: String(amountEtb) },
      payment_intent_data: { metadata: { purpose: 'wallet_topup', wallet_id: wallet.id, amount_etb: String(amountEtb) } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripeInstance = stripe as any;
    let session: Record<string,unknown>;
    try { session = await stripeInstance.checkout.sessions.create(buildParams(currency)); }
    catch (e) { if (currency==='etb') { currency='usd'; session = await stripeInstance.checkout.sessions.create(buildParams('usd')); } else throw e; }
    await pool.query(`INSERT INTO wallet_transactions (wallet_id,type,amount,description,reference) VALUES ($1,'pending_topup',$2,'Stripe wallet top-up (pending)',$3)`, [wallet.id, amountEtb, session.id]);
    res.json({ checkout_url: session.url, session_id: session.id, display: currency==='usd'?{currency:'USD',amount:toCents('usd')/100,rate}:{currency:'ETB',amount:amountEtb} });
  } catch (err) {
    logger.error({ err }, 'Stripe wallet topup error');
    apiError.serverError(res, 'Failed to initialize Stripe top-up');
  }
});

module.exports = router;
module.exports.atomicWalletOp = atomicWalletOp;
