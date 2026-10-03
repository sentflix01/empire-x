'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { FlaskConical, ShieldCheck, Loader2 } from 'lucide-react';
import { auth } from '@/api/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { useSearchParams } from 'next/navigation';

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/feed';
  const path = value.split(/[?#]/, 1)[0];
  if (path === '/choose-mode' || path === '/login' || path === '/register') return '/feed';
  return value;
}

function ChooseMode() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get('return'));
  const { user, isAuthenticated, authChecked } = useAuth();
  const [pending, setPending] = useState<'demo' | 'real' | null>(null);
  const [error, setError] = useState('');
  const applyingSavedPreference = useRef(false);

  useEffect(() => {
    if (!authChecked) return;
    // Unauthenticated visitors may land here from the Sign in CTA - staying
    // logged out is fine: choosing Demo / Real stores the intent and we route
    // them to /login. Only require auth for the manual "Switch back" flows
    // where demo vs real environments need the session to mutate.
  }, [authChecked, isAuthenticated]);

  const ready = authChecked && isAuthenticated;
  const isDemo = Boolean(user?.is_demo);

  useEffect(() => {
    if (!ready || !user?.onboarding_mode || applyingSavedPreference.current) return;
    applyingSavedPreference.current = true;

    if (user.onboarding_mode === 'real') {
      localStorage.setItem('nodbusiness_real_mode', 'true');
      window.location.replace(returnTo);
      return;
    }

    localStorage.setItem('nodbusiness_real_mode', 'false');
    auth.loginDemo()
      .then(() => window.location.replace(returnTo))
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { error?: string } }; message?: string };
        setError(e.response?.data?.error || e.message || 'Could not restore your saved demo mode. Please try again.');
      });
  }, [ready, returnTo, user?.onboarding_mode]);

  async function choose(mode: 'demo' | 'real') {
    setPending(mode);
    setError('');

    // Anonymous visitors: persist chosen mode and take them to /login so
    // they can actually sign in/register with the account matching their mode.
    if (!isAuthenticated) {
      localStorage.setItem('nodbusiness_onboarding_mode', mode);
      window.location.assign(`/login?mode=${mode}`);
      return;
    }

    // The STORAGE_KEY used by RealModeContext — we write it directly here
    // so the correct filter is active the moment /feed loads.
    const REAL_MODE_KEY = 'nodbusiness_real_mode';

    try {
      if (mode === 'demo') {
        // Demo mode: disable the real-only filter before navigating.
        localStorage.setItem(REAL_MODE_KEY, 'false');

        // Save this preference while the request still uses the real user's
        // token. The demo identity cannot change the real profile afterward.
        if (!isDemo) await auth.setOnboardingMode('demo');

        // The backend selects the configured sandbox track. Never silently
        // continue with the real account if demo initialization failed.
        await auth.loginDemo();
        window.location.assign(returnTo);
        return;
      }

      // Real Account mode: filter out ALL seed/demo data via X-Real-Only: 1.
      // This is what makes the feed blank until real users post content.
      if (isDemo) {
        // Shared demo account can't switch to real — send to register.
        window.location.assign('/register');
        return;
      }

      localStorage.setItem(REAL_MODE_KEY, 'true');
      await auth.setOnboardingMode('real');
      window.location.assign(returnTo);

    } catch (err) {
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

  if (!authChecked || (isAuthenticated && Boolean(user?.onboarding_mode) && !error)) return spinner;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 px-5 py-12 text-white">
      <section className="mx-auto max-w-3xl">

        <div className="mb-4">
          <Link href="/landing" className="text-sm font-semibold text-white/70 hover:text-white underline-offset-2 hover:underline">
            Back to Landing
          </Link>
        </div>

        <p className="text-sm font-semibold uppercase tracking-[.18em] text-blue-300">
          Welcome to Nodbusiness
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          How would you like to continue?
        </h1>
        <p className="mt-3 max-w-2xl text-white/65">
          Your choice is remembered for future sign-ins. Demo uses pre-loaded seed data;
          Real Account is your own blank slate. You can switch environments later from Settings.
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
              disabled={pending !== null}
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
              disabled={pending !== null}
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
