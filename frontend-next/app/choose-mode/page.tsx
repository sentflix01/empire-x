'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FlaskConical, ShieldCheck, Loader2 } from 'lucide-react';
import { auth } from '@/api/auth';
import { Button } from '@/components/ui/button';

function ChooseMode() {
  const params = useSearchParams();
  // Sanitise return URL — never encode choose-mode into itself
  const rawReturn = params.get('return') || '/feed';
  const returnTo =
    rawReturn.startsWith('/') &&
    !rawReturn.startsWith('//') &&
    !rawReturn.startsWith('/choose-mode')
      ? rawReturn
      : '/feed';

  const [pending, setPending] = useState<'demo' | 'real' | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    auth.me().then((user) => {
      // Already chose — skip this screen
      if (user.is_demo === true || user.onboarding_mode === 'demo' || user.onboarding_mode === 'real') {
        window.location.replace('/feed');
        return;
      }
      setReady(true);
    }).catch(() => {
      // Not logged in — send to login with a clean return URL
      window.location.replace('/login?return=%2Fchoose-mode');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choose(mode: 'demo' | 'real') {
    setPending(mode);
    setError('');
    try {
      await auth.setOnboardingMode(mode);
      if (mode === 'demo') await auth.loginDemo();
      window.location.assign(mode === 'demo' ? '/feed' : returnTo);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || 'Could not set up this mode. Please try again.');
      setPending(null);
    }
  }

  const spinner = (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white/50" />
    </main>
  );

  if (!ready && !error) return spinner;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 px-5 py-12 text-white">
      <section className="mx-auto max-w-3xl">

        <p className="text-sm font-semibold uppercase tracking-[.18em] text-blue-300">
          Welcome to Nodbusiness
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          How would you like to get started?
        </h1>
        <p className="mt-3 max-w-2xl text-white/65">
          Explore with seed data in demo mode, or go straight to your real account.
          You can switch any time from Settings.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">

          {/* ── Try Demo ───────────────────────────────────────────────── */}
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

          {/* ── Real Account ───────────────────────────────────────────── */}
          <article className="flex flex-col rounded-2xl border border-white/15 bg-white/5 p-6">
            <ShieldCheck className="h-8 w-8 text-emerald-300" />
            <h2 className="mt-4 text-xl font-semibold">Real Account</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-white/65">
              Start with your own blank account. Everything you create is real —
              your profile, your businesses, your products, and your transactions.
              No seed data.
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full border-white/20 bg-transparent text-white hover:bg-white/10"
              disabled={!ready || pending !== null}
              onClick={() => choose('real')}
            >
              {pending === 'real' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Use Real Account
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
