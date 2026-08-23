import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL  = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

export async function notifyUser(userId: string, message: string): Promise<void> {
  if (!BASE_URL) return;
  try {
    const { rows } = await pool.query('SELECT telegram_chat_id FROM user_profiles WHERE user_id=$1', [userId]);
    const chatId = rows[0]?.telegram_chat_id as string | undefined;
    if (!chatId) return;
    const res = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
    if (!res.ok) logger.warn({ userId, status: res.status }, 'Telegram sendMessage failed');
  } catch (err) {
    logger.error({ err: (err as Error).message, userId }, 'Telegram notification error');
  }
}

router.post('/connect', requireAuth, async (req: Request, res: Response) => {
  const { chat_id } = req.body as { chat_id?: string };
  if (!chat_id) { res.status(400).json({ error: 'chat_id is required' }); return; }
  try {
    await pool.query('UPDATE user_profiles SET telegram_chat_id=$1,updated_at=NOW() WHERE user_id=$2', [chat_id, req.user!.id]);
    res.json({ connected: true });
  } catch { res.status(500).json({ error: 'Failed to connect Telegram' }); }
});

router.post('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE user_profiles SET telegram_chat_id=NULL,updated_at=NOW() WHERE user_id=$1', [req.user!.id]);
    res.json({ connected: false });
  } catch { res.status(500).json({ error: 'Failed to disconnect Telegram' }); }
});

router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT telegram_chat_id FROM user_profiles WHERE user_id=$1', [req.user!.id]);
    res.json({ connected: !!(rows[0]?.telegram_chat_id), bot_configured: !!BOT_TOKEN });
  } catch { res.status(500).json({ error: 'Failed to get Telegram status' }); }
});

router.post('/test', requireAuth, async (req: Request, res: Response) => {
  if (!BOT_TOKEN) { res.status(503).json({ error: 'Telegram bot not configured' }); return; }
  try {
    await notifyUser(req.user!.id, '👋 <b>Test notification from Nodbusiness!</b>\nYour Telegram integration is working correctly.');
    res.json({ sent: true });
  } catch { res.status(500).json({ error: 'Failed to send test notification' }); }
});

module.exports = router;
module.exports.notifyUser = notifyUser;
