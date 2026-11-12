/** A product as GET /api/maps/nearby/product-search returns it. Price is NUMERIC, so a decimal string. */
export interface MapSearchProduct {
  id: string;
  seller_id?: string;
  title?: string;
  price?: number | string | null;
  currency?: string | null;
  images?: unknown;
}

/** A person in a people search on the map. */
export interface MapSearchPerson {
  user_id: string;
  display_name?: string | null;
  headline?: string | null;
  avatar_url?: string | null;
  distance_km?: number;
  latitude?: string | null;
  longitude?: string | null;
}

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
    matched_products?: MapSearchProduct[];
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
  products_matched: MapSearchProduct[];
  total_matches: number;
  users?: MapSearchPerson[];
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
