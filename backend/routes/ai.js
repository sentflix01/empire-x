const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const ai = require('../lib/ai');
const logger = require('../lib/logger');

const NODBUSINESS_SYSTEM_PROMPT = `You are Nodbusiness AI — a smart, friendly assistant built into the Nodbusiness superapp, available globally.
Nodbusiness features: social feed, marketplace, tasks/errands, showrooms (business mini-sites), jobs, events, courses, wallet, referrals, nearby map, and real-time chat.
Help users with: finding products, posting tasks, creating showrooms, growing their business, writing descriptions, and navigating the app.
Keep replies concise (2-4 sentences max). Use emojis occasionally. Respond in the same language the user writes in.`;

// POST /api/ai/generate-description
router.post('/generate-description', requireAuth, async (req, res) => {
  const { title, category, type = 'product' } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  if (!ai.isConfigured()) {
    return res.status(503).json({
      error: 'AI service not configured. Add OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY to backend/.env',
    });
  }

  try {
    const prompt = buildPrompt(title, category, type);
    const description = await ai.complete(prompt, { maxTokens: 150, temperature: 0.7 });
    res.json({ description });
  } catch (err) {
    logger.error({ err: err.message }, 'AI generate-description error');
    res.status(500).json({ error: err.message || 'Failed to generate description' });
  }
});

// POST /api/ai/chat
router.post('/chat', requireAuth, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!ai.isConfigured()) {
    return res.json({
      reply: "I'm the Nodbusiness AI assistant, but the AI service isn't configured yet. Ask your admin to add OPENAI_API_KEY (or GEMINI_API_KEY / ANTHROPIC_API_KEY) to the backend .env file. In the meantime, I can help you navigate the app — try the Marketplace, Tasks, or Showrooms!",
    });
  }

  try {
    const reply = await ai.chat(messages, {
      maxTokens: 300,
      temperature: 0.7,
      systemPrompt: NODBUSINESS_SYSTEM_PROMPT,
    });
    res.json({ reply });
  } catch (err) {
    logger.error({ err: err.message }, 'AI chat error');
    res.status(500).json({ error: err.message || 'Failed to get AI response' });
  }
});

// GET /api/ai/status — check which provider is active
router.get('/status', requireAuth, async (req, res) => {
  res.json({
    configured: ai.isConfigured(),
    provider: ai.provider,
    model: process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || process.env.ANTHROPIC_MODEL || 'default',
  });
});

function buildPrompt(title, category, type) {
  const map = {
    product:  `Write a short product description for "${title}"${category ? ` in the ${category} category` : ''}. Focus on benefits and universal appeal. Max 80 words.`,
    business: `Write a short business description for "${title}"${category ? ` (${category})` : ''}. Professional, welcoming, max 80 words.`,
    job:      `Write a short job description intro for the position "${title}"${category ? ` in ${category}` : ''}. Professional, appealing to global job seekers. Max 80 words.`,
    showroom: `Write a tagline/description for a showroom called "${title}"${category ? ` (${category})` : ''}. Inviting and memorable. Max 60 words.`,
  };
  return map[type] || map.product;
}

module.exports = router;
