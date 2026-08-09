'use client';
/**
 * Legacy route — the templates picker now lives inside the unified
 * Showroom Studio wizard at /showroom/create (step 1).
 * Redirects while preserving query params.
 */
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function Redirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('step', '1');
    router.replace(`/showroom/create?${p.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return null;
}

export default function ShowroomTemplatesPage() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}
