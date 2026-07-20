import { QueryClient } from '@tanstack/react-query';

// Create a new QueryClient per component tree in Next.js App Router
// to avoid sharing state between server renders
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // Don't refetch data that was fetched within the last 30 seconds — avoids
        // unnecessary network hits when navigating between pages.
        staleTime: 30 * 1000,
        // Keep unused query data in the cache for 5 minutes so navigating back
        // to a page shows instant data while a background refresh runs.
        gcTime: 5 * 60 * 1000,
        // Only retry once on failure to avoid hammering a struggling backend.
        retry: 1,
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
