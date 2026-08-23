import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ── VAPID setup ───────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT ?? 'mailto:support@nodbusiness.app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webpush: any = null;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush = require('web-push');
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'web-push not available');
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = '/notifications',
): Promise<void> {
  if (!webpush) return;
  try {
    const { rows } = await pool.query('SELECT * FROM push_subscriptions WHERE user_id=$1', [userId]);
    for (const sub of rows) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url, icon: '/icon-192.png' }),
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]);
        }
      }
    }
  } catch (err) {
    logger.error({ err: (err as Error).message, userId }, 'Push notification error');
  }
}

router.get('/vapid-public-key', (_req: Request, res: Response) => {
  if (!VAPID_PUBLIC_KEY) { res.status(503).json({ error: 'Push notifications not configured' }); return; }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post('/subscribe', requireAuth, async (req: Request, res: Response) => {
  const { endpoint, keys } = req.body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'endpoint and keys (p256dh, auth) are required' }); return;
  }
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id,endpoint,p256dh,auth) VALUES ($1,$2,$3,$4)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh=$3, auth=$4, updated_at=NOW()`,
      [req.user!.id, endpoint, keys.p256dh, keys.auth],
    );
    res.status(201).json({ subscribed: true });
  } catch { res.status(500).json({ error: 'Failed to save subscription' }); }
});

router.delete('/unsubscribe', requireAuth, async (req: Request, res: Response) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) { res.status(400).json({ error: 'endpoint is required' }); return; }
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2', [req.user!.id, endpoint]);
    res.json({ unsubscribed: true });
  } catch { res.status(500).json({ error: 'Failed to remove subscription' }); }
});

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
