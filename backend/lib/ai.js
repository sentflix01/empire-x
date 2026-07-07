/**
 * ai.js — AI abstraction layer
 *
 * Supports multiple providers via a unified interface.
 * Switch providers by setting AI_PROVIDER in .env:
 *   AI_PROVIDER=openai   (default)
 *   AI_PROVIDER=gemini
 *   AI_PROVIDER=anthropic
 *
 * This means switching AI providers only requires a config change —
 * no code changes anywhere else.
 *
 * Usage:
 *   const ai = require('./lib/ai');
 *   const text = await ai.complete('Write a product description for...');
 *   const reply = await ai.chat([{ role: 'user', content: 'Hello' }]);
 */
const logger = require('./logger');

const PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase();

// ── OpenAI ────────────────────────────────────────────────────────────────────
async function openaiComplete(prompt, { maxTokens = 150, temperature = 0.7 } = {}) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'OpenAI error'); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function openaiChat(messages, opts = {}) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const { maxTokens = 300, temperature = 0.7, systemPrompt } = opts;
  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: allMessages.slice(-10),
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'OpenAI error'); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ── Google Gemini ─────────────────────────────────────────────────────────────
async function geminiComplete(prompt, opts = {}) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Gemini error'); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function geminiChat(messages, opts = {}) {
  // Convert OpenAI-style messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  return geminiComplete(lastUserMsg, opts);
}

// ── Anthropic Claude ──────────────────────────────────────────────────────────
async function anthropicChat(messages, opts = {}) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const { maxTokens = 300, systemPrompt } = opts;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.slice(-10),
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Anthropic error'); }
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || '';
}

// ── Provider router ───────────────────────────────────────────────────────────
const PROVIDERS = {
  openai:    { complete: openaiComplete,   chat: openaiChat    },
  gemini:    { complete: geminiComplete,   chat: geminiChat    },
  anthropic: { complete: anthropicChat,    chat: anthropicChat },
};

function getProvider() {
  const provider = PROVIDERS[PROVIDER];
  if (!provider) {
    logger.warn({ provider: PROVIDER }, 'Unknown AI provider — falling back to openai');
    return PROVIDERS.openai;
  }
  return provider;
}

/**
 * Check if any AI provider is configured.
 */
function isConfigured() {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.ANTHROPIC_API_KEY
  );
}

/**
 * Generate a text completion from the active AI provider.
 */
async function complete(prompt, opts = {}) {
  if (!isConfigured()) throw new Error('No AI provider configured. Add OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY to .env');
  const provider = getProvider();
  logger.debug({ provider: PROVIDER, promptLength: prompt.length }, 'AI complete');
  return provider.complete(prompt, opts);
}

/**
 * Send a chat conversation to the active AI provider.
 * messages: [{ role: 'user'|'assistant', content: string }]
 */
async function chat(messages, opts = {}) {
  if (!isConfigured()) throw new Error('No AI provider configured');
  const provider = getProvider();
  logger.debug({ provider: PROVIDER, messageCount: messages.length }, 'AI chat');
  return provider.chat(messages, opts);
}

module.exports = { complete, chat, isConfigured, provider: PROVIDER };
