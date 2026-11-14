'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';

/**
 * Shown on /landing?demo=ended (see DEMO_ENDED_REDIRECT in lib/AuthContext.tsx)
 * when a Demo practice session ended while the visitor was using it.
 */
export default function DemoEndedNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') !== 'ended') return;
    setShow(true);
    // Drop the flag so a reload does not show the notice again.
    params.delete('demo');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }, []);

  if (!show) return null;
  return (
    // Floats at the top of the hero (it never adds height, so the hero stays one screen tall)
    // and follows the theme.
    <div role="status" data-testid="demo-ended-notice" className="absolute inset-x-4 top-[4.5rem] z-10 mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 text-left text-sm text-foreground shadow-lg backdrop-blur dark:border-white/25 dark:bg-inverse/90 dark:text-white">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">
        <strong>Your Demo practice session has ended.</strong> Choose <strong>Try Demo</strong> to start a fresh one, or create an account to keep your work.
      </p>
      <button type="button" onClick={() => setShow(false)} aria-label="Dismiss" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted dark:hover:bg-white/15">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
