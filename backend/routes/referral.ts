import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { getPrimaryFrontendUrl } from '../lib/frontendUrl';

const router = Router();

// Reward amounts shown in the Referral page and docs/growth/GROWTH_STRATEGY.md.
const REFERRER_POINTS = 50;
const REFEREE_POINTS = 20;

router.get('/my-code', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT referral_code FROM users WHERE id=$1', [req.user!.id]);
    if (!rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    let code = rows[0].referral_code as string | null;
    if (!code) {
      code = req.user!.id.replace(/-/g, '').slice(0, 8).toUpperCase();
      await pool.query('UPDATE users SET referral_code=$1 WHERE id=$2', [code, req.user!.id]);
    }
    // Two independent aggregates: joining users to point_transactions would
    // multiply the referral count by the number of point rows and vice versa.
    const { rows: stats } = await pool.query(
      `SELECT (SELECT COUNT(*) FROM users WHERE referred_by=$1) AS referrals,
              (SELECT COALESCE(SUM(points),0) FROM point_transactions
                WHERE user_id=$1 AND type='earn' AND reference LIKE 'referral:%') AS earned`,
      [req.user!.id],
    );
    const referrals = parseInt(stats[0].referrals as string, 10);
    res.json({
      code,
      referral_link: `${getPrimaryFrontendUrl()}/register?ref=${encodeURIComponent(code)}`,
      referrals,
      total_referred: referrals,
      earned: parseInt(stats[0].earned as string, 10),
    });
  } catch { res.status(500).json({ error: 'Failed to fetch referral code' }); }
});

async function awardPoints(client: import('pg').PoolClient, userId: string, points: number, reason: string, reference: string): Promise<void> {
  await client.query(
    `INSERT INTO point_transactions (user_id, type, points, reason, reference) VALUES ($1,'earn',$2,$3,$4)`,
    [userId, points, reason, reference],
  );
  await client.query('UPDATE user_profiles SET points = points + $1 WHERE user_id=$2', [points, userId]);
}

router.post(['/apply', '/use'], requireAuth, async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (typeof code !== 'string' || !code.trim()) { res.status(400).json({ error: 'code is required' }); return; }
  const client = await pool.connect();
  try {
    const userId = req.user!.id;
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id FROM users WHERE referral_code=$1 AND id!=$2', [code.trim().toUpperCase(), userId]);
    if (!rows.length) { await client.query('ROLLBACK'); res.status(404).json({ error: 'Invalid referral code' }); return; }
    const referrerId = rows[0].id as string;
    const { rowCount } = await client.query('UPDATE users SET referred_by=$1 WHERE id=$2 AND referred_by IS NULL', [referrerId, userId]);
    if (!rowCount) { await client.query('ROLLBACK'); res.status(409).json({ error: 'A referral code has already been applied' }); return; }
    await awardPoints(client, referrerId, REFERRER_POINTS, 'Referral bonus', `referral:${userId}`);
    await awardPoints(client, userId, REFEREE_POINTS, 'Referral welcome bonus', `referral:${userId}`);
    await client.query('COMMIT');
    res.json({ success: true, points_awarded: REFEREE_POINTS, message: `Referral applied! You earned ${REFEREE_POINTS} points` });
  } catch { await client.query('ROLLBACK').catch(() => undefined); res.status(500).json({ error: 'Failed to use referral code' }); }
  finally { client.release(); }
});

module.exports = router;
