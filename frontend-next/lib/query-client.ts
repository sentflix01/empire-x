import { QueryClient } from '@tanstack/react-query';

// Create a new QueryClient per component tree in Next.js App Router
// to avoid sharing state between server renders
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Refetch on window focus so users returning to the tab see fresh data.
        // Per-query overrides with refetchOnWindowFocus: false are used for
        // stable data (settings, profile config) that doesn't need live updates.
        refetchOnWindowFocus: true,
        // Don't refetch data that was fetched within the last 60 seconds — doubled
        // from 30s to reduce unnecessary backend hits on tab switches.
        staleTime: 60 * 1000,
        // Keep unused query data for 10 minutes for instant back-navigation.
        gcTime: 10 * 60 * 1000,
        // Only retry once on failure.
        retry: 1,
        // Don't refetch when reconnecting — backend has Redis cache
        refetchOnReconnect: false,
      },
    },
  });
}

// Browser singleton — reuse the same instance on the client
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

// Keep the old export for any files that still import it directly
export const queryClientInstance = getQueryClient();
