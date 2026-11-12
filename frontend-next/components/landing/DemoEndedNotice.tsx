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
    <div role="status" className="mt-5 flex w-full max-w-xl items-start gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-left text-sm text-white backdrop-blur sm:mt-6">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">
        <strong>Your Demo practice session has ended.</strong> Choose <strong>Try Demo</strong> to start a fresh one, or create an account to keep your work.
      </p>
      <button type="button" onClick={() => setShow(false)} aria-label="Dismiss" className="rounded-lg p-1 hover:bg-white/15">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
