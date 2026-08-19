const router = require('express').Router();
const logger = require('../lib/logger');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'NodbusinessBot';

/**
 * Send a Telegram message to a user (internal helper)
 */
async function sendTelegram(chatId, text) {
  if (!BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Telegram send failed');
  }
}

/**
 * Notify a user via Telegram if they have it connected
 */
async function notifyUser(userId, message) {
  try {
    const { rows } = await pool.query(
      'SELECT telegram_chat_id, telegram_notifications FROM users WHERE id = $1',
      [userId]
    );
    if (rows[0]?.telegram_notifications && rows[0]?.telegram_chat_id) {
      await sendTelegram(rows[0].telegram_chat_id, message);
    }
  } catch {}
}

// Get Telegram connection info
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT telegram_chat_id, telegram_notifications FROM users WHERE id = $1',
      [req.user.id]
    );
    const connected = !!rows[0]?.telegram_chat_id;
    res.json({
      connected,
      notifications_enabled: rows[0]?.telegram_notifications || false,
      bot_username: BOT_USERNAME,
      connect_url: `https://t.me/${BOT_USERNAME}?start=${req.user.id}`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Telegram status' });
  }
});

// Toggle Telegram notifications
router.put('/notifications', requireAuth, async (req, res) => {
  const { enabled } = req.body;
  try {
    await pool.query(
      'UPDATE users SET telegram_notifications = $1 WHERE id = $2',
      [!!enabled, req.user.id]
    );
    res.json({ enabled: !!enabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update Telegram settings' });
  }
});

// Disconnect Telegram
router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET telegram_chat_id = NULL, telegram_notifications = FALSE WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect Telegram' });
  }
});

// Telegram webhook — receives messages from users
router.post('/webhook', async (req, res) => {
  res.json({ ok: true }); // Acknowledge immediately
  const message = req.body?.message;
  if (!message) return;
  const chatId = message.chat?.id;
  const text = message.text || '';

  if (text.startsWith('/start ')) {
    const userId = text.split(' ')[1];
    if (userId) {
      try {
        await pool.query(
          'UPDATE users SET telegram_chat_id = $1, telegram_notifications = TRUE WHERE id = $2',
          [String(chatId), userId]
        );
        await sendTelegram(chatId,
          `👑 <b>Nodbusiness Connected!</b>\n\nYou'll now receive notifications for:\n` +
          `• New orders\n• New messages\n• Task bids\n• Task updates\n\nType /stop to disable notifications.`
        );
      } catch (err) {
        logger.error({ err: err?.message || err }, 'Telegram webhook error:');
      }
    }
  } else if (text === '/stop') {
    try {
      await pool.query(
        'UPDATE users SET telegram_notifications = FALSE WHERE telegram_chat_id = $1',
        [String(chatId)]
      );
      await sendTelegram(chatId, '🔕 Notifications disabled. Type /start to re-enable.');
    } catch {}
  } else if (text === '/help') {
    await sendTelegram(chatId,
      `👑 <b>Nodbusiness Bot</b>\n\nCommands:\n/stop — Disable notifications\n/help — Show this message`
    );
  }
});

module.exports = router;
module.exports.notifyUser = notifyUser;
module.exports.sendTelegram = sendTelegram;
