import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL  = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

// The Telegram columns live on users (migrate3.js): telegram_chat_id and
// telegram_notifications. These routes used to query user_profiles, which has
// neither, so every route failed and no notification was ever sent (audit F-005).

/** Sends only when the person connected a chat and has notifications on. */
export async function notifyUser(userId: string, message: string): Promise<void> {
  if (!BASE_URL) return;
  try {
    const { rows } = await pool.query<{ telegram_chat_id: string | null; telegram_notifications: boolean }>(
      'SELECT telegram_chat_id, telegram_notifications FROM users WHERE id=$1', [userId],
    );
    const chatId = rows[0]?.telegram_chat_id;
    if (!chatId || !rows[0]?.telegram_notifications) return;
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

/** A Telegram chat id: digits, negative for groups. */
const CHAT_ID = /^-?\d{1,20}$/;

router.post('/connect', requireAuth, async (req: Request, res: Response) => {
  const raw = (req.body as { chat_id?: unknown }).chat_id;
  const chatId = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
  if (!CHAT_ID.test(chatId)) { res.status(400).json({ error: 'chat_id must be a Telegram chat id (digits)' }); return; }
  try {
    await pool.query('UPDATE users SET telegram_chat_id=$1, telegram_notifications=TRUE WHERE id=$2', [chatId, req.user!.id]);
    res.json({ connected: true, notifications_enabled: true });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Telegram connect error');
    res.status(500).json({ error: 'Failed to connect Telegram' });
  }
});

async function disconnect(req: Request, res: Response): Promise<void> {
  try {
    await pool.query('UPDATE users SET telegram_chat_id=NULL, telegram_notifications=FALSE WHERE id=$1', [req.user!.id]);
    res.json({ connected: false, notifications_enabled: false });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Telegram disconnect error');
    res.status(500).json({ error: 'Failed to disconnect Telegram' });
  }
}
// The settings screen sends DELETE; POST is kept for older clients.
router.post('/disconnect', requireAuth, disconnect);
router.delete('/disconnect', requireAuth, disconnect);

router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<{ telegram_chat_id: string | null; telegram_notifications: boolean }>(
      'SELECT telegram_chat_id, telegram_notifications FROM users WHERE id=$1', [req.user!.id],
    );
    const connected = Boolean(rows[0]?.telegram_chat_id);
    res.json({ connected, notifications_enabled: connected && Boolean(rows[0]?.telegram_notifications), bot_configured: !!BOT_TOKEN });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Telegram status error');
    res.status(500).json({ error: 'Failed to get Telegram status' });
  }
});

// Turns Telegram notifications on or off (audit F-005: the settings toggle called this, which did not exist).
router.put('/notifications', requireAuth, async (req: Request, res: Response) => {
  const enabled = (req.body as { enabled?: unknown }).enabled;
  if (typeof enabled !== 'boolean') { res.status(400).json({ error: 'enabled must be true or false' }); return; }
  try {
    const { rows } = await pool.query<{ telegram_notifications: boolean }>(
      `UPDATE users SET telegram_notifications=$2 WHERE id=$1 AND (telegram_chat_id IS NOT NULL OR $2 = FALSE)
       RETURNING telegram_notifications`, [req.user!.id, enabled],
    );
    if (!rows.length) { res.status(409).json({ error: 'Connect Telegram first.', code: 'TELEGRAM_NOT_CONNECTED' }); return; }
    res.json({ enabled: rows[0].telegram_notifications });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Telegram notifications toggle error');
    res.status(500).json({ error: 'Failed to update Telegram notifications' });
  }
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
