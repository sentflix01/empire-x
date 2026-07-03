const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

// POST /api/ai/generate-description
// Body: { title, category, type: 'product'|'business'|'job'|'showroom' }
router.post('/generate-description', requireAuth, async (req, res) => {
  const { title, category, type = 'product' } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured. Add OPENAI_API_KEY to backend/.env' });
  }

  try {
    const prompt = buildPrompt(title, category, type);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes concise, compelling descriptions for an African marketplace app called Empire X. Keep descriptions under 100 words. Be specific and persuasive.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenAI request failed');
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() || '';
    res.json({ description });
  } catch (err) {
    console.error('AI error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate description' });
  }
});

function buildPrompt(title, category, type) {
  const map = {
    product: `Write a short product description for "${title}"${category ? ` in the ${category} category` : ''}. Focus on benefits and appeal to Ethiopian buyers.`,
    business: `Write a short business description for a business called "${title}"${category ? ` in the ${category} category` : ''}. Make it professional and welcoming.`,
    job: `Write a short job description intro for the position "${title}"${category ? ` in ${category}` : ''}. Sound professional and appealing to job seekers in Ethiopia.`,
    showroom: `Write a short tagline/description for a showroom called "${title}"${category ? ` in the ${category} category` : ''}. Make it inviting and memorable.`,
  };
  return map[type] || map.product;
}

module.exports = router;
