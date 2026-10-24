/**
 * Feed Spotlight must survive a stored section list that isn't a list: a
 * production showroom had `{}`, and every feed that included it crashed with
 * "s.includes is not a function".
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { spotlightSectionIds } from '@/lib/spotlightSections';
import FeedSpotlightWidget from '@/components/feed/FeedSpotlightWidget';

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

describe('FeedSpotlightWidget', () => {
  it('renders nothing instead of crashing when the section list is not a list', () => {
    const props = {
      sections: [{ type: 'about', title: 'About us' }],
      spotlightMode: 'single' as const,
      spotlightSectionIds: {} as unknown as string[],
      spotlightCarouselCount: 1,
      themeColor: '#2563eb',
      showroomSlug: 'men-s-grooming',
    };
    expect(() => render(<FeedSpotlightWidget {...(props as React.ComponentProps<typeof FeedSpotlightWidget>)} />)).not.toThrow();
  });
});
