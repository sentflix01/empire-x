import { QueryClient } from '@tanstack/react-query';

// Create a new QueryClient per component tree in Next.js App Router
// to avoid sharing state between server renders
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        // Prevent refetching immediately on mount during SSR hydration
        staleTime: 60 * 1000,
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
