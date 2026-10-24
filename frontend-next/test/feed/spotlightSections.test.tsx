/**
 * Feed Spotlight must survive a stored section list that isn't a list: a
 * production showroom had `{}`, and every feed that included it crashed with
 * "s.includes is not a function".
 */
import { describe, it, expect } from 'vitest';
import { spotlightSectionIds } from '@/lib/spotlightSections';

describe('spotlightSectionIds', () => {
  it('reads a list or a JSON string of a list', () => {
    expect(spotlightSectionIds(['menu', 'about'])).toEqual(['menu', 'about']);
    expect(spotlightSectionIds('["services"]')).toEqual(['services']);
  });

  it('treats anything else as no sections chosen', () => {
    for (const bad of [{}, '{}', 'null', null, undefined, 42, 'not json', '"menu"', [1, null, '']]) {
      expect(spotlightSectionIds(bad)).toEqual([]);
    }
  });
});
