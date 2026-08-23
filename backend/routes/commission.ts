/**
 * routes/commission.ts — Platform commission tracking
 *
 * collectCommission uses atomicWalletOp (imported from wallet.ts) so the
 * balance deduction and transaction record are written atomically.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE ?? '0.03');

export async function collectCommission(
  orderId: string,
  sellerId: string,
  totalPrice: number,
): Promise<void> {
  const amount = parseFloat((totalPrice * COMMISSION_RATE).toFixed(2));
  try {
    await pool.query(
      `INSERT INTO commissions (order_id, seller_id, gross, rate, amount)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [orderId, sellerId, totalPrice, COMMISSION_RATE, amount],
    );
    if (amount <= 0) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { atomicWalletOp } = require('./wallet') as { atomicWalletOp: (userId: string, type: string, amount: number, description: string) => Promise<unknown> };
    try {
      await atomicWalletOp(sellerId, 'debit', amount, `Platform commission (${(COMMISSION_RATE * 100).toFixed(0)}%) for order`);
    } catch (walletErr: unknown) {
      if ((walletErr as { code?: string }).code !== 'INSUFFICIENT_BALANCE') throw walletErr;
      logger.warn({ sellerId, orderId, amount }, 'Commission: insufficient seller balance — recorded, deduction skipped');
    }
  } catch (err) {
    logger.error({ err: (err as Error).message, orderId, sellerId }, 'Commission collection failed');
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
