'use client';
/**
 * Legacy route — sample previews now render inline inside the unified
 * Showroom Studio wizard at /showroom/create (step 2).
 * Redirects while preserving query params.
 */
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function Redirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('step', '2');
    router.replace(`/showroom/create?${p.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return null;
}

export default function ShowroomSamplesPage() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}
