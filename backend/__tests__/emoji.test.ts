import { isEmoji, MAX_EMOJI_LENGTH } from '../lib/emoji';
import { isReaction, REACTIONS } from '../lib/socialGraph';

describe('isEmoji (any single emoji as a reaction)', () => {
  it.each(['👍', '❤️', '🦒', '👍🏽', '👨‍👩‍👧', '🇪🇹', '1️⃣', '#️⃣', '🏳️‍🌈', '☕'])('accepts %s', (e) => {
    expect(isEmoji(e)).toBe(true);
  });

  it.each(['', ' ', 'a', 'like', '1', '😂😂', '👍 ', 'ok👍', '<b>', null, undefined, 42, {}, ['👍']])('refuses %p', (v) => {
    expect(isEmoji(v)).toBe(false);
  });

  it('refuses anything longer than the database allows', () => {
    expect(MAX_EMOJI_LENGTH).toBe(32);
    expect(isEmoji('👍'.repeat(20))).toBe(false);
  });

  it('keeps the quick row valid', () => {
    for (const r of REACTIONS) expect(isReaction(r)).toBe(true);
  });
});
