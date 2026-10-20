/**
 * lib/clef.ts — Cloudflare Clef-Flash decision model client
 *
 * A lightweight System One classifier that sits in front of content write paths
 * (posts, messages) to catch spam and policy violations before they reach the DB.
 *
 * Configuration (all optional — omitting any key disables that code path):
 *   CLOUDFLARE_ACCOUNT_ID   — Cloudflare account ID
 *   CLOUDFLARE_AI_TOKEN     — Workers AI API token (Bearer)
 *
 * Free tier: ~700 average analyses/day at no cost via Cloudflare Workers AI.
 * Paid:      $0.038 / million input tokens beyond the free allowance.
 *
 * Fail-open design: if Clef is unconfigured, times out, or errors, classify()
 * returns `null` so callers treat the content as safe and proceed normally.
 * Never let a third-party classifier take down your write path.
 *
 * Usage:
 *   import { classify, isConfigured } from '../lib/clef';
 *   const result = await classify(text);
 *   if (result?.spam > 0.90) return res.status(400).json({ error: 'spam_detected' });
 */

import logger from './logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClefResult {
  /** 0–1 probability the content is spam or unsolicited promotion */
  spam: number;
  /**
   * Policy category. "none" means no violation detected.
   * Confidence of the winning choice is in policyConfidence.
   */
  policy: 'none' | 'harassment' | 'explicit' | 'violence' | 'misinformation';
  /** 0–1 confidence for the policy choice — low value signals an ambiguous case */
  policyConfidence: number;
  /** 0–1 probability the content conveys urgency or distress */
  urgent: number;
  /** Raw answers from Clef (preserved for logging / future use) */
  raw: Record<string, unknown>;
}

interface ClefNoulAnswer {
  type: 'noul';
  noul: number;
}

interface ClefChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

type ClefAnswer = ClefNoulAnswer | ClefChoiceAnswer;

interface ClefApiResponse {
  answers: Record<string, ClefAnswer>;
}

// ── Configuration ─────────────────────────────────────────────────────────────

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? '';
const AI_TOKEN   = process.env.CLOUDFLARE_AI_TOKEN   ?? '';

/** True when Clef credentials are present. */
export function isConfigured(): boolean {
  return Boolean(ACCOUNT_ID && AI_TOKEN);
}

// ── Client ────────────────────────────────────────────────────────────────────

const CLEF_MODEL   = '@cf/cloudflare/clef-flash';
const TIMEOUT_MS   = 3_000; // 3 s — fast enough to stay in the request path
const MAX_STATE_LEN = 2_000; // truncate very long inputs to keep token cost low

/**
 * Classify `text` for spam, policy violations, and urgency.
 *
 * Returns `null` when Clef is unconfigured or the call fails — callers must
 * treat null as "safe" (fail-open) to avoid blocking the write path.
 */
export async function classify(text: string): Promise<ClefResult | null> {
  if (!isConfigured()) return null;
  if (!text || !text.trim()) return null;

  // Truncate to keep cost low and latency predictable
  const state = text.slice(0, MAX_STATE_LEN);

  const body = {
    model: CLEF_MODEL,
    state,
    questions: {
      spam: {
        type: 'noul',
        instructions: 'This message is spam, unsolicited promotion, or machine-generated junk',
      },
      policy: {
        type: 'choice',
        instructions: 'Classify any content policy violation. Choose "none" when there is no violation.',
        criteria: {
          none:          'No policy violation — ordinary user content',
          harassment:    'Targeted personal attacks, slurs, bullying, or threats directed at a person',
          explicit:      'Graphic sexual content or nudity descriptions',
          violence:      'Graphic violence, gore, or incitement to physical harm',
          misinformation: 'Deliberate false claims about health, safety, or public facts',
        },
      },
      urgent: {
        type: 'noul',
        instructions: 'The sender conveys urgency, distress, or an immediate need for help',
      },
    },
  };

  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${CLEF_MODEL}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        Authorization:  `Bearer ${AI_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '(unreadable)');
      logger.warn({ status: res.status, body: errorBody }, 'Clef non-OK response — failing open');
      return null;
    }

    const data = await res.json() as { result?: ClefApiResponse };
    const answers = data?.result?.answers;

    if (!answers) {
      logger.warn({ data }, 'Clef unexpected response shape — failing open');
      return null;
    }

    const spamAnswer    = answers['spam']   as ClefNoulAnswer  | undefined;
    const policyAnswer  = answers['policy'] as ClefChoiceAnswer | undefined;
    const urgentAnswer  = answers['urgent'] as ClefNoulAnswer  | undefined;

    return {
      spam:             spamAnswer?.noul             ?? 0,
      policy:           (policyAnswer?.choice        ?? 'none') as ClefResult['policy'],
      policyConfidence: policyAnswer?.confidence     ?? 0,
      urgent:           urgentAnswer?.noul            ?? 0,
      raw:              answers,
    };
  } catch (err) {
    const isAbort = (err as Error)?.name === 'AbortError';
    logger.warn(
      { err: (err as Error).message, timedOut: isAbort },
      `Clef classify ${isAbort ? 'timed out' : 'error'} — failing open`,
    );
    return null;
  }
}

/**
 * Log a Clef result and return a human-readable decision for request handlers.
 *
 *   'block'  — high-confidence spam or clear policy violation → reject the content
 *   'flag'   — likely violation or low-confidence edge case    → store but flag for review
 *   'pass'   — nothing notable detected                        → proceed normally
 */
export type ClefDecision = 'block' | 'flag' | 'pass';

export function decide(result: ClefResult | null): ClefDecision {
  if (!result) return 'pass'; // fail-open when Clef is unavailable

  // Hard block: very high-confidence spam or explicit policy hit
  if (result.spam >= 0.92) return 'block';
  if (result.policy !== 'none' && result.policyConfidence >= 0.85) return 'block';

  // Soft flag: probable spam, policy hit with lower confidence, or ambiguous edge case
  if (result.spam >= 0.70) return 'flag';
  if (result.policy !== 'none' && result.policyConfidence >= 0.60) return 'flag';

  return 'pass';
}
