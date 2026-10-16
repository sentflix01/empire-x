'use client';
/**
 * global-error.tsx — Last-resort boundary for errors thrown in the ROOT
 * LAYOUT itself (outside any segment error.tsx). Replaces the browser's
 * default white screen. Must render its own <html>/<body>.
 */
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/components/GlobalErrorReporter';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      message: error.message,
      name: error.name || 'GlobalError',
      stack: error.stack ?? null,
      context: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#fafafa' }}>
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            textAlign: 'center',
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#71717a', maxWidth: 384 }}>
            A critical error occurred. Please try again.
          </p>
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
