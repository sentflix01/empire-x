/**
 * routes/commission.ts — Platform commission tracking
 *
 * Read-only history of commissions charged before 2026-10-16. NodBusiness no
 * longer charges commission.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// No new platform commission is charged (owner decision 2026-10-16: revenue is
// subscriptions only; see docs/decisions/platform-model-decisions.md). These
// read-only routes keep commissions recorded before that decision visible.

router.get('/my-commissions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, o.product_title FROM commissions c JOIN orders o ON o.id=c.order_id WHERE c.seller_id=$1 ORDER BY c.created_at DESC LIMIT 100`,
      [req.user!.id],
    );
    const total = rows.reduce((sum, c) => sum + parseFloat(c.amount as string), 0);
    res.json({ commissions: rows, total_paid: total, rate: 0 });
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
