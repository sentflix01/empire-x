/**
 * lib/ai.ts — AI abstraction layer
 *
 * Unified interface over OpenAI, Google Gemini, and Anthropic Claude.
 * Switch providers via AI_PROVIDER env var — no code changes needed.
 *
 * Usage:
 *   import { complete, chat } from './lib/ai';
 *   const text = await complete('Write a product description for...');
 *   const reply = await chat([{ role: 'user', content: 'Hello' }]);
 */
import logger from './logger';

const PROVIDER = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

type ProviderImpl = {
  complete: (prompt: string, opts?: CompletionOptions) => Promise<string>;
  chat: (messages: ChatMessage[], opts?: CompletionOptions) => Promise<string>;
};

// ── OpenAI ────────────────────────────────────────────────────────────────────

async function openaiComplete(prompt: string, opts: CompletionOptions = {}): Promise<string> {
  const { maxTokens = 150, temperature = 0.7 } = opts;
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) {
    const e = await res.json() as { error?: { message?: string } };
    throw new Error(e.error?.message ?? 'OpenAI error');
  }
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function openaiChat(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  const { maxTokens = 300, temperature = 0.7, systemPrompt } = opts;
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const recentMessages = messages.slice(-10);
  const allMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...recentMessages]
    : recentMessages;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo',
      messages: allMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) {
    const e = await res.json() as { error?: { message?: string } };
    throw new Error(e.error?.message ?? 'OpenAI error');
  }
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ── Google Gemini ─────────────────────────────────────────────────────────────

async function geminiComplete(prompt: string, _opts: CompletionOptions = {}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!res.ok) {
    const e = await res.json() as { error?: { message?: string } };
    throw new Error(e.error?.message ?? 'Gemini error');
  }
  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function geminiChat(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  const { maxTokens = 300, temperature = 0.7, systemPrompt } = opts;
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

  const recentMessages = messages.slice(-10);
  if (recentMessages[0]?.role === 'assistant') recentMessages.shift();
  if (!recentMessages.length) throw new Error('A user message is required');

  const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
        contents: recentMessages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    },
  );
  if (!res.ok) {
    const e = await res.json() as { error?: { message?: string } };
    throw new Error(e.error?.message ?? 'Gemini error');
  }
  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? '';
}

// ── Anthropic Claude ──────────────────────────────────────────────────────────

async function anthropicChat(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  const { maxTokens = 300, systemPrompt } = opts;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.slice(-10),
    }),
  });
  if (!res.ok) {
    const e = await res.json() as { error?: { message?: string } };
    throw new Error(e.error?.message ?? 'Anthropic error');
  }
  const data = await res.json() as { content?: Array<{ text?: string }> };
  return data.content?.[0]?.text?.trim() ?? '';
}

// ── Provider router ───────────────────────────────────────────────────────────

const PROVIDERS: Record<string, ProviderImpl> = {
  openai:    { complete: openaiComplete,   chat: openaiChat    },
  gemini:    { complete: geminiComplete,   chat: geminiChat    },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  anthropic: { complete: anthropicChat as any,    chat: anthropicChat    },
};

function getProvider(): ProviderImpl {
  const provider = PROVIDERS[PROVIDER];
  if (!provider) {
    logger.warn({ provider: PROVIDER }, 'Unknown AI provider — falling back to openai');
    return PROVIDERS['openai'];
  }
  return provider;
}

/** Returns true when at least one provider API key is configured. */
export function isConfigured(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.ANTHROPIC_API_KEY
  );
}

/** Active provider name (for health check). */
export const provider: string = PROVIDER;

/** Generate a text completion from the active AI provider. */
export async function complete(prompt: string, opts: CompletionOptions = {}): Promise<string> {
  if (!isConfigured()) throw new Error('No AI provider configured. Add OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY to .env');
  logger.debug({ provider: PROVIDER, promptLength: prompt.length }, 'AI complete');
  return getProvider().complete(prompt, opts);
}

/** Send a chat conversation to the active AI provider. */
export async function chat(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  if (!isConfigured()) throw new Error('No AI provider configured');
  logger.debug({ provider: PROVIDER, messageCount: messages.length }, 'AI chat');
  return getProvider().chat(messages, opts);
}

module.exports = { complete, chat, isConfigured, provider };
