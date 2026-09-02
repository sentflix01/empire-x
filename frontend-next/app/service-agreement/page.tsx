'use client';

import { Suspense } from 'react';
import ServiceAgreementPage from '@/views/ServiceAgreement';

/**
 * Legal terms must remain accessible before authentication. Keeping this route
 * outside the authenticated app group prevents login redirects during Link
 * prefetching from the registration form.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ServiceAgreementPage />
    </Suspense>
  );
}
