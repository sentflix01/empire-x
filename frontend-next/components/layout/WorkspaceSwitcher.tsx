'use client';

import { useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

export default function WorkspaceSwitcher() {
  const { user, isAuthenticated, logout } = useAuth();
  const [switching, setSwitching] = useState(false);
  if (!isAuthenticated || !user) return null;

  const exitDemo = () => {
    if (switching) return;
    setSwitching(true);
    logout('/');
  };

  if (!user.demo_session_active && !user.is_demo) return null;
  const demoMessage = user.demo_session_anonymous
    ? 'Temporary session; activity stays separate from Real accounts.'
    : user.demo_session_active
      ? 'Practice data is separate from Real accounts; payments are unavailable.'
      : 'Legacy Demo account. Log out, then sign in to your Real account.';
  return (
    <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span><strong>Demo practice</strong> · {demoMessage}</span>
      </div>
      <Button size="sm" variant="outline" disabled={switching} onClick={() => void exitDemo()}>
        {switching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Log out of Demo
      </Button>
    </div>
  );
}
