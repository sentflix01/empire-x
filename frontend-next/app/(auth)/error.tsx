'use client';
/**
 * error.tsx — Error boundary for auth pages (login, register, etc.)
 */
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/components/GlobalErrorReporter';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      message: error.message,
      name: error.name || 'AuthPageError',
      stack: error.stack ?? null,
      context: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">Please refresh the page or try again.</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>Try again</Button>
        <Button variant="ghost" onClick={() => (window.location.href = '/login')}>
          Back to login
        </Button>
      </div>
    </div>
  );
}
