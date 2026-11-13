'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import client, { storeToken } from '@/lib/api/client';
import { useAuth } from '@/lib/AuthContext';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

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
      if (isAuthenticated) {
        toast.error('Log out of your account first, then start Demo practice. Demo and Real accounts stay separate.');
        return;
      }

      const response = await client.post<{ access_token: string }>('/api/auth/demo');

      storeToken(response.data.access_token);
      await completeLogin();
      router.push('/feed');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not start Demo practice.'));
    } finally {
      setStarting(false);
    }
  }

  return (
    <button
      data-page-guide="landing-demo-btn"
      type="button"
      onClick={() => void enterDemo()}
      disabled={!authChecked || starting}
      aria-busy={starting}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-7 text-sm font-extrabold text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
    >
      {starting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FlaskConical className="h-4 w-4" aria-hidden="true" />}
      Try Demo
    </button>
  );
}
