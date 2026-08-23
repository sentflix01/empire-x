'use client';
/**
 * error.tsx — Next.js App Router error boundary for all authenticated pages.
 * Catches any unhandled render or async errors within the (app) route group.
 * The `reset` function re-renders the segment, clearing the error state.
 */
import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/components/GlobalErrorReporter';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      message: error.message,
      name: error.name || 'AppRouterError',
      stack: error.stack ?? null,
      context: { digest: error.digest, location: window.location.pathname },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          An unexpected error occurred. Please try again or refresh the page.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="ghost" onClick={() => (window.location.href = '/feed')}>
          Go to feed
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 max-w-lg text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Error details
          </summary>
          <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {error.stack ?? error.message}
          </pre>
        </details>
      )}
    </div>
  );
}
