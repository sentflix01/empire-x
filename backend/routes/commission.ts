/**
 * routes/commission.ts — Platform commission tracking
 *
 * collectCommission inserts the commission row and debits the seller wallet
 * (walletOpInTransaction from wallet.ts) in one transaction, once per order.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE ?? '0.03');

/**
 * Record the platform commission for an order and debit it from the seller's
 * wallet — at most once per order. Online orders reach this twice (when the
 * payment is confirmed and again when the buyer marks the order completed), so
 * the commissions row is claimed through the unique index on order_id
 * (migrate52.js) and the wallet is only debited when this call inserted it.
 * The insert and the debit share one transaction.
 */
export async function collectCommission(
  orderId: string,
  sellerId: string,
  totalPrice: number,
): Promise<void> {
  const amount = parseFloat((totalPrice * COMMISSION_RATE).toFixed(2));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: inserted } = await client.query(
      `INSERT INTO commissions (order_id, seller_id, gross, rate, amount)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (order_id) DO NOTHING RETURNING id`,
      [orderId, sellerId, totalPrice, COMMISSION_RATE, amount],
    );
    if (inserted.length && amount > 0) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { walletOpInTransaction } = require('./wallet') as typeof import('./wallet');
      await client.query('SAVEPOINT commission_debit');
      try {
        await walletOpInTransaction(
          client,
          sellerId,
          'debit',
          amount,
          `Platform commission (${(COMMISSION_RATE * 100).toFixed(0)}%) for order`,
          `commission:${orderId}`,
        );
        await client.query('RELEASE SAVEPOINT commission_debit');
      } catch (walletErr: unknown) {
        if ((walletErr as { code?: string }).code !== 'INSUFFICIENT_BALANCE') throw walletErr;
        await client.query('ROLLBACK TO SAVEPOINT commission_debit');
        logger.warn({ sellerId, orderId, amount }, 'Commission: insufficient seller balance — recorded, deduction skipped');
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    logger.error({ err: (err as Error).message, orderId, sellerId }, 'Commission collection failed');
  } finally {
    client.release();
  }
}

router.get('/my-commissions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, o.product_title FROM commissions c JOIN orders o ON o.id=c.order_id WHERE c.seller_id=$1 ORDER BY c.created_at DESC LIMIT 100`,
      [req.user!.id],
    );
    const total = rows.reduce((sum, c) => sum + parseFloat(c.amount as string), 0);
    res.json({ commissions: rows, total_paid: total, rate: COMMISSION_RATE });
  } catch { res.status(500).json({ error: 'Failed to fetch commissions' }); }
});

router.get('/admin/summary', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS total_orders, SUM(gross) AS total_gross, SUM(amount) AS total_commission, AVG(rate) AS avg_rate FROM commissions`,
    );
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to fetch commission summary' }); }
});

module.exports = router;
module.exports.collectCommission = collectCommission;
