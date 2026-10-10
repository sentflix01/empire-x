'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import client, { storeToken } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';

export default function TryDemoButton() {
  const router = useRouter();
  const { user, isAuthenticated, authChecked, completeLogin } = useAuth();
  const [starting, setStarting] = useState(false);

  async function enterDemo() {
    if (starting || !authChecked) return;
    setStarting(true);
    try {
      if (isAuthenticated && user?.demo_session_active) {
        router.push('/feed');
        return;
      }

      const response = isAuthenticated && !user?.is_demo
        ? await client.post<{ access_token: string }>('/api/auth/workspace', { workspace: 'demo' })
        : isAuthenticated
          ? null
          : await client.post<{ access_token: string }>('/api/auth/demo');

      if (!response) {
        toast.error('Please sign in to your Real account before opening Demo practice.');
        return;
      }

      storeToken(response.data.access_token);
      await completeLogin();
      router.push('/feed');
    } catch (error) {
      const cause = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(cause.response?.data?.error || cause.message || 'Could not start Demo practice.');
    } finally {
      setStarting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void enterDemo()}
      disabled={!authChecked || starting}
      aria-busy={starting}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-400 px-7 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
    >
      {starting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FlaskConical className="h-4 w-4" aria-hidden="true" />}
      Try Demo
    </button>
  );
}
