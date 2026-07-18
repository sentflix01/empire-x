export interface MapSearchResult {
  businesses: Array<{
    id: string;
    owner_id: string;
    business_name?: string;
    display_name?: string;
    latitude?: string;
    longitude?: string;
    business_category?: string;
    avatar_url?: string;
    distance_km?: number;
    matched_products?: any[];
  }>;
  geo_products: Array<{
    id: string;
    seller_id: string;
    title?: string;
    category?: string;
    latitude?: string;
    longitude?: string;
    distance_km?: number;
  }>;
  products_matched: any[];
  total_matches: number;
  users?: any[];
  searchType?: 'people' | 'place';
}

export interface MapSearchState {
  query: string;
  results: MapSearchResult | null;
  loading: boolean;
  searchType: 'people' | 'place' | null;
}

export function getMapSearchDisplayState(state: MapSearchState) {
  const hasSubmittedSearch = Boolean(state.query && state.query.trim().length >= 2);
  const isSearchComplete = hasSubmittedSearch && !state.loading && Boolean(state.results);

  return {
    shouldShowResults: isSearchComplete && (state.searchType === 'place' || state.searchType === 'people'),
    shouldShowEmptyState: !hasSubmittedSearch && !state.loading,
  };
}
