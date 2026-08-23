import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/my-code', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT referral_code FROM users WHERE id=$1', [req.user!.id]);
    if (!rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    let code = rows[0].referral_code as string | null;
    if (!code) {
      code = req.user!.id.replace(/-/g, '').slice(0, 8).toUpperCase();
      await pool.query('UPDATE users SET referral_code=$1 WHERE id=$2', [code, req.user!.id]);
    }
    const { rows: stats } = await pool.query(
      `SELECT COUNT(*) AS referrals, COALESCE(SUM(pt.amount),0) AS earned
       FROM users u LEFT JOIN point_transactions pt ON pt.user_id=$1 AND pt.type='earn' AND pt.description ILIKE '%referral%'
       WHERE u.referred_by=$1`,
      [req.user!.id],
    );
    res.json({ code, referrals: parseInt(stats[0].referrals as string), earned: parseFloat(stats[0].earned as string) });
  } catch { res.status(500).json({ error: 'Failed to fetch referral code' }); }
});

router.post('/use', async (req: Request, res: Response) => {
  const { code, userId } = req.body as { code?: string; userId?: string };
  if (!code || !userId) { res.status(400).json({ error: 'code and userId are required' }); return; }
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE referral_code=$1 AND id!=$2', [code.toUpperCase(), userId]);
    if (!rows.length) { res.status(404).json({ error: 'Invalid referral code' }); return; }
    await pool.query('UPDATE users SET referred_by=$1 WHERE id=$2 AND referred_by IS NULL', [rows[0].id, userId]);
    await pool.query(
      `INSERT INTO point_transactions (user_id,type,amount,description) VALUES ($1,'earn',50,'Referral bonus') ON CONFLICT DO NOTHING`,
      [rows[0].id],
    );
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to use referral code' }); }
});

module.exports = router;
