'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FlaskConical, ShieldCheck, Loader2 } from 'lucide-react';
import { auth } from '@/api/auth';
import { Button } from '@/components/ui/button';

function ChooseMode() {
  const params = useSearchParams();
  const rawReturn = params.get('return') || '/feed';
  const returnTo = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '/feed';
  const [pending, setPending] = useState<'demo' | 'real' | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    auth.me().then((user) => {
      if (user.is_demo === true || user.onboarding_mode === 'demo' || user.onboarding_mode === 'real') {
        window.location.replace('/feed');
        return;
      }
      setReady(true);
    }).catch(() => {
      window.location.replace(`/login?return=${encodeURIComponent(`/choose-mode?return=${returnTo}`)}`);
    });
  }, [returnTo]);

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

  return <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 px-5 py-12 text-white">
    <section className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[.18em] text-blue-300">Welcome to Nodbusiness</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">How would you like to get started?</h1>
      <p className="mt-3 max-w-2xl text-white/65">Choose a private practice environment or continue with your real account. You can switch later.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-blue-300/30 bg-blue-400/10 p-6">
          <FlaskConical className="h-8 w-8 text-blue-300" />
          <h2 className="mt-4 text-xl font-semibold">Explore the demo sandbox</h2>
          <p className="mt-2 min-h-16 text-sm leading-6 text-white/65">Try building and publishing with temporary data in an isolated demo account. Demo changes do not alter your real account.</p>
          <Button className="mt-5 w-full" disabled={!ready || pending !== null} onClick={() => choose('demo')}>
            {pending === 'demo' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Start demo
          </Button>
        </article>
        <article className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <ShieldCheck className="h-8 w-8 text-emerald-300" />
          <h2 className="mt-4 text-xl font-semibold">Use my real account</h2>
          <p className="mt-2 min-h-16 text-sm leading-6 text-white/65">Go to your regular account and keep your real profile, businesses, and activity separate from practice data.</p>
          <Button variant="outline" className="mt-5 w-full border-white/20 bg-transparent text-white hover:bg-white/10" disabled={!ready || pending !== null} onClick={() => choose('real')}>
            {pending === 'real' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Continue to real account
          </Button>
        </article>
      </div>
    </section>
  </main>;
}

export default function ChooseModePage() {
  return <Suspense><ChooseMode /></Suspense>;
}
