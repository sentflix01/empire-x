/** Colours named in words (owner, 15 Nov 2026: no colour codes for people). */
import { describe, it, expect } from 'vitest';
import { COLOUR_PALETTE, colourName, nearestColour } from '@/lib/colourNames';

describe('colour names', () => {
  it('has 36 distinct, named colours', () => {
    expect(COLOUR_PALETTE).toHaveLength(36);
    expect(new Set(COLOUR_PALETTE.map((c) => c.hex)).size).toBe(36);
    expect(new Set(COLOUR_PALETTE.map((c) => c.name)).size).toBe(36);
  });
  it('names any colour in words', () => {
    expect(colourName('#2563eb')).toBe('Blue');
    expect(colourName('#b8860b')).toMatch(/gold/i); // a template's dark goldenrod
    expect(colourName('#ff6600')).toMatch(/orange/i);
    expect(colourName('#ffffff')).toBe('White');
    expect(colourName('#fff8e7')).toBe('Cream');
    expect(colourName('#111111')).toMatch(/Black|Charcoal/);
    expect(colourName('not a colour')).toBe('Custom colour');
  });
  it('finds the palette colour itself', () => {
    for (const c of COLOUR_PALETTE) expect(nearestColour(c.hex)?.name).toBe(c.name);
  });
});
