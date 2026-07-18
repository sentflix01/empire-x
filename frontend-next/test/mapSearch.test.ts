import { describe, it, expect } from 'vitest';
import { getMapSearchDisplayState, type MapSearchState } from '@/types/map-search';

describe('getMapSearchDisplayState', () => {
  it('does not show results before a search is submitted', () => {
    const state: MapSearchState = {
      query: '',
      results: null,
      loading: false,
      searchType: null,
    };

    expect(getMapSearchDisplayState(state)).toEqual({
      shouldShowResults: false,
      shouldShowEmptyState: true,
    });
  });

  it('shows results once a search completes', () => {
    const state: MapSearchState = {
      query: 'shoes',
      results: {
        businesses: [],
        geo_products: [],
        products_matched: [],
        total_matches: 0,
        searchType: 'place',
      },
      loading: false,
      searchType: 'place',
    };

    expect(getMapSearchDisplayState(state)).toEqual({
      shouldShowResults: true,
      shouldShowEmptyState: false,
    });
  });
});
