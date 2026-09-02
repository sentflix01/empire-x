import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Redis as RedisClient } from 'ioredis';
import logger from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import { complete, chat, isConfigured } from '../lib/ai';
import { isEnabled } from '../lib/featureFlags';
import { getRedis } from '../lib/redis';
import type { ChatMessage } from '../lib/ai';

const router = Router();

// ── Per-user AI rate limiting ─────────────────────────────────────────────────
// Prevents a single authenticated user from exhausting the AI provider quota.
// Window: 1 hour. Max calls: 30 (generate) + 50 (chat) per user per window.
const AI_GENERATE_LIMIT = parseInt(process.env.AI_GENERATE_LIMIT_PER_HOUR ?? '30', 10);
const AI_CHAT_LIMIT     = parseInt(process.env.AI_CHAT_LIMIT_PER_HOUR     ?? '50', 10);
const AI_RATE_WINDOW    = 60 * 60; // 1 hour in seconds

async function checkAiRateLimit(
  userId: string,
  action: 'generate' | 'chat',
  res: Response,
): Promise<boolean> {
  const redis = getRedis();
  if (redis.isNoOp) return true; // Redis absent — skip limiting in dev
  const limit = action === 'generate' ? AI_GENERATE_LIMIT : AI_CHAT_LIMIT;
  const key = `ai_rate:${action}:${userId}`;
  try {
    const count = await (redis as RedisClient).incr(key);
    if (count === 1) {
      // Set TTL only on first call in the window
      await (redis as RedisClient).expire(key, AI_RATE_WINDOW);
    }
    if (count > limit) {
      res.status(429).json({
        error: `AI ${action} rate limit exceeded. Maximum ${limit} requests per hour.`,
        retry_after: AI_RATE_WINDOW,
      });
      return false;
    }
  } catch (err) {
    // Redis error → fail open (don't block the user)
    logger.warn({ err: (err as Error).message, userId, action }, 'AI rate limit Redis error — skipping');
  }
  return true;
}

router.get('/status', (_req: Request, res: Response) => {
  res.json({ configured: isConfigured(), provider: process.env.AI_PROVIDER ?? 'openai' });
});

router.post('/generate', requireAuth, async (req: Request, res: Response) => {
  if (!(await isEnabled('ai_description_gen', req.user!.id))) {
    res.status(503).json({ error: 'AI description generation is not enabled' }); return;
  }
  if (!(await checkAiRateLimit(req.user!.id, 'generate', res))) return;
  const { prompt, max_tokens, temperature } = req.body as Record<string, unknown>;
  if (!prompt || typeof prompt !== 'string') { res.status(400).json({ error: 'prompt (string) is required' }); return; }
  if (prompt.length > 2000) { res.status(400).json({ error: 'prompt must be 2,000 characters or fewer' }); return; }
  try {
    const text = await complete(prompt, { maxTokens: Number(max_tokens) || 150, temperature: Number(temperature) || 0.7 });
    res.json({ text });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'AI generate error');
    res.status(500).json({ error: (err as Error).message ?? 'AI generation failed' });
  }
});

router.post('/chat', requireAuth, async (req: Request, res: Response) => {
  if (!(await isEnabled('ai_chat', req.user!.id))) {
    res.status(503).json({ error: 'AI chat is not enabled' }); return;
  }
  if (!(await checkAiRateLimit(req.user!.id, 'chat', res))) return;
  const { messages, system_prompt, max_tokens } = req.body as {
    messages?: ChatMessage[]; system_prompt?: string; max_tokens?: number;
  };
  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: 'messages (array) is required' }); return;
  }
  if (messages.length > 20) { res.status(400).json({ error: 'Maximum 20 messages per request' }); return; }
  try {
    const text = await chat(messages, {
      systemPrompt: system_prompt ?? 'You are a helpful assistant for Nodbusiness, a global marketplace and social platform.',
      maxTokens: max_tokens ?? 300,
    });
    res.json({ text });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'AI chat error');
    res.status(500).json({ error: (err as Error).message ?? 'AI chat failed' });
  }
});

module.exports = router;
