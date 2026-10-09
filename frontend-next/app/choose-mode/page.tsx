'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function LegacyAccountChooserRedirect() {
  const params = useSearchParams();

  useEffect(() => {
    const destination = new URL(params.get('intent') === 'signup' ? '/register' : '/login', window.location.origin);
    const returnTo = params.get('return');
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) destination.searchParams.set('return', returnTo);
    window.location.replace(destination.toString());
  }, [params]);

  return <main className="flex min-h-screen items-center justify-center bg-background text-foreground" aria-live="polite">Taking you to sign in…</main>;
}

export default function ChooseModePage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading…</main>}><LegacyAccountChooserRedirect /></Suspense>;
}
