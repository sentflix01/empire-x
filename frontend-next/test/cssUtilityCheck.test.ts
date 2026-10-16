/**
 * Guard against Tailwind utilities that silently produce no CSS (see
 * scripts/cssUtilityCheck.mjs and `npm run check:css`).
 */
import { describe, it, expect } from 'vitest';
import { extractCandidates, cssEscape, cssHasUtility, findMissingUtilities } from '../scripts/cssUtilityCheck.mjs';

describe('extractCandidates', () => {
  it('finds theme utilities behind variants and modifiers', () => {
    const found = extractCandidates(
      'className="hover:bg-primary/90 md:text-muted-foreground data-[state=open]:animate-in !rounded-lg -translate-x-1"',
    );
    expect([...found].sort()).toEqual(['animate-in', 'bg-primary/90', 'rounded-lg', 'text-muted-foreground']);
  });

  it('ignores lookalikes inside other identifiers', () => {
    expect(extractCandidates('const fooBg = mybg-card; url("/x/bg-card.png")').size).toBe(0);
  });
});

describe('cssHasUtility', () => {
  const css = '.bg-card{background:red}.hover\\:bg-primary\\/90:hover{x:1}.text-muted-foreground{y:1}';

  it('matches plain and variant selectors', () => {
    expect(cssHasUtility(css, 'bg-card')).toBe(true);
    expect(cssHasUtility(css, 'bg-primary/90')).toBe(true);
  });

  it('does not treat a longer utility as a match', () => {
    expect(cssHasUtility(css, 'text-muted')).toBe(false);
    expect(cssHasUtility(css, 'bg-primary')).toBe(false);
  });

  it('escapes selector characters', () => {
    expect(cssEscape('bg-primary/90')).toBe('bg-primary\\/90');
  });
});

describe('findMissingUtilities', () => {
  it('reports a token the theme does not define, with the files using it', () => {
    const sources = new Map([
      ['a.tsx', '<div className="bg-card text-foreground" />'],
      ['b.tsx', '<div className="bg-card" />'],
    ]);
    expect(findMissingUtilities(sources, '.text-foreground{}')).toEqual([{ name: 'bg-card', files: ['a.tsx', 'b.tsx'] }]);
  });

  it('skips allowlisted non-class strings', () => {
    const sources = new Map([['a.tsx', "style={{ 'border-radius': 4 }}"]]);
    expect(findMissingUtilities(sources, '')).toEqual([]);
  });
});
