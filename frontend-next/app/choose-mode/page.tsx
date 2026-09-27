'use client';

import { Suspense, useEffect, useState } from 'react';
import { FlaskConical, ShieldCheck, Loader2 } from 'lucide-react';
import { auth } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

function ChooseMode() {
  const { user, isAuthenticated, authChecked } = useAuth();
  const [pending, setPending] = useState<'demo' | 'real' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated) {
      window.location.replace('/login?return=%2Fchoose-mode');
    }
  }, [authChecked, isAuthenticated]);

  const ready = authChecked && isAuthenticated;
  const isDemo = Boolean(user?.is_demo);

  async function choose(mode: 'demo' | 'real') {
    setPending(mode);
    setError('');
    try {
      if (mode === 'demo') {
        // is_demo accounts are already the demo identity — go straight to feed.
        // Real accounts need loginDemo() to log in as the test account.
        if (!isDemo) await auth.loginDemo();
        window.location.assign('/feed');
        return;
      }

      // Real Account:
      if (isDemo) {
        // Shared demo account can't become a real account — send to register.
        window.location.assign('/register');
        return;
      }

      // Save preference in background — but do NOT block navigation on it.
      // If the backend endpoint doesn't exist yet (old deploy), we still go
      // to /feed. The preference will be saved on next load via /api/auth/me.
      auth.setOnboardingMode('real').catch(() => undefined);
      window.location.assign('/feed');

    } catch (err) {
      // Show the real error — HTTP status + message — not just the fallback.
      const e = err as {
        response?: { status?: number; data?: { error?: string; code?: string } };
        message?: string;
        status?: number;
      };
      const status = e.response?.status ?? e.status;
      const msg = e.response?.data?.error ?? e.response?.data?.code ?? e.message;
      const display = msg
        ? `${msg}${status ? ` (${status})` : ''}`
        : `Could not set up this mode${status ? ` (HTTP ${status})` : ''}. Please try again.`;
      setError(display);
      setPending(null);
    }
  }

  const spinner = (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white/50" />
    </main>
  );

  if (!authChecked) return spinner;
  if (!isAuthenticated) return spinner;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 px-5 py-12 text-white">
      <section className="mx-auto max-w-3xl">

        <p className="text-sm font-semibold uppercase tracking-[.18em] text-blue-300">
          Welcome to Nodbusiness
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          How would you like to continue?
        </h1>
        <p className="mt-3 max-w-2xl text-white/65">
          Choose every time you sign in. Demo uses pre-loaded seed data with full
          access. Real Account is your own blank slate — everything you do is permanent.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-500/15 p-3 text-sm font-mono text-red-200 break-all">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">

          {/* ── Try Demo ─────────────────────────────────────────────── */}
          <article className="flex flex-col rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
            <FlaskConical className="h-8 w-8 text-amber-300" />
            <h2 className="mt-4 text-xl font-semibold">Try Demo</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-white/65">
              Browse and build with pre-loaded seed data. Full access to every
              feature — feed, showroom builder, marketplace, AI, and more.
              Nothing affects your real account.
            </p>
            <Button
              className="mt-6 w-full bg-amber-500 text-white hover:bg-amber-400"
              disabled={!ready || pending !== null}
              onClick={() => choose('demo')}
            >
              {pending === 'demo' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Try Demo
            </Button>
          </article>

          {/* ── Real Account ─────────────────────────────────────────── */}
          <article className="flex flex-col rounded-2xl border border-white/15 bg-white/5 p-6">
            <ShieldCheck className="h-8 w-8 text-emerald-300" />
            <h2 className="mt-4 text-xl font-semibold">Real Account</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-white/65">
              {isDemo
                ? "You're on the shared demo account. To use the real platform, create your own account — your profile, businesses, and transactions will be permanent."
                : 'Start with your own blank account. Everything you create is real — your profile, your businesses, your products, and your transactions. No seed data.'}
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full border-white/20 bg-transparent text-white hover:bg-white/10"
              disabled={!ready || pending !== null}
              onClick={() => choose('real')}
            >
              {pending === 'real' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDemo ? 'Create My Account' : 'Use Real Account'}
            </Button>
          </article>

        </div>
      </section>
    </main>
  );
}

export default function ChooseModePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </main>
    }>
      <ChooseMode />
    </Suspense>
  );
}
