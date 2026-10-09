'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, Loader2, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import client, { storeToken } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

export default function WorkspaceSwitcher() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);
  if (!isAuthenticated || !user) return null;

  // Old shared Demo identities cannot be safely mapped to a Real account by
  // matching email. Give the user a direct route to authenticate their own
  // canonical Real account instead of a misleading in-place switch prompt.
  if (user.is_demo && !user.demo_session_active) {
    return (
      <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
        <span className="text-sm">You are in a legacy shared Demo account. Sign in to your Real account to continue with your own data.</span>
        <Button size="sm" variant="outline" onClick={() => router.push('/login?intent=real')}>
          Sign in to Real
        </Button>
      </div>
    );
  }

  const activeWorkspace = user.demo_session_active ? 'demo' : 'real';
  const targetWorkspace = activeWorkspace === 'demo' ? 'real' : 'demo';
  const canSwitchToDemo = user.demo_workspace_available === true;

  async function switchWorkspace(): Promise<void> {
    if (switching) return;
    setSwitching(true);
    try {
      const { data } = await client.post<{ access_token: string; workspace: 'real' | 'demo' }>(
        '/api/auth/workspace', { workspace: targetWorkspace },
      );
      storeToken(data.access_token);
      queryClient.clear();
      await refreshUser();
      toast.success(`Switched to ${data.workspace === 'demo' ? 'Demo practice' : 'Real workspace'}`);
    } catch (error) {
      const cause = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(cause.response?.data?.error || cause.message || 'Could not switch workspace.');
    } finally {
      setSwitching(false);
    }
  }

  const inDemo = activeWorkspace === 'demo';
  return (
    <div className={`mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${inDemo
      ? 'border-amber-300/50 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'
      : 'border-emerald-300/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100'}`}>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {inDemo ? <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span><strong>{inDemo ? 'Demo workspace' : 'Real workspace'}</strong>{inDemo ? ' · Practice activity stays separate; payments are unavailable.' : canSwitchToDemo ? ' · Your real account and business activity.' : ' · Demo practice is not configured on this deployment yet.'}</span>
      </div>
      <Button size="sm" variant="outline" disabled={switching || (targetWorkspace === 'demo' && !canSwitchToDemo)} onClick={() => void switchWorkspace()} aria-label={canSwitchToDemo ? `Switch to ${targetWorkspace} workspace` : 'Demo workspace unavailable'}>
        {switching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {targetWorkspace === 'demo' && !canSwitchToDemo ? 'Demo unavailable' : `Switch to ${targetWorkspace === 'demo' ? 'Demo' : 'Real'}`}
      </Button>
    </div>
  );
}
