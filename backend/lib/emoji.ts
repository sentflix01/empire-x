/**
 * Reactions can be any single emoji (owner decision, Oct 2026: "all the
 * emojis", in messages and comments), not a fixed list. "Single" is one
 * user-perceived character, so skin tones (👍🏽), flags (🇪🇹), keycaps (1️⃣)
 * and joined sequences (👩🏾‍💻, 👨‍👩‍👧) count as one; words and several
 * emojis do not.
 */
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

/** Longest single emoji we accept, in UTF-16 units (family + skin tones fit comfortably). */
export const MAX_EMOJI_LENGTH = 32;

const EMOJI_PART = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;
// Letters and digits that aren't part of a keycap/emoji presentation make it text, not an emoji.
const PLAIN_TEXT = /[\p{L}\p{N}](?![️⃣])/u;

export function isEmoji(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s || s.length > MAX_EMOJI_LENGTH || s !== value) return false;
  const graphemes = [...segmenter.segment(s)];
  if (graphemes.length !== 1) return false;
  if (!EMOJI_PART.test(s)) return false;
  // "1️⃣" is fine; "a" or "1" alone is not.
  return !PLAIN_TEXT.test(s.replace(/[0-9#*]️?⃣/gu, ''));
}
