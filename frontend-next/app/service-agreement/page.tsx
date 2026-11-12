'use client';

import { Suspense } from 'react';
import ServiceAgreementPage from '@/views/ServiceAgreement';
import MainContent from '@/components/layout/MainContent';

/**
 * Legal terms must remain accessible before authentication. Keeping this route
 * outside the authenticated app group prevents login redirects during Link
 * prefetching from the registration form.
 */
export default function Page() {
  return (
    <MainContent>
      <Suspense fallback={null}>
        <ServiceAgreementPage />
      </Suspense>
    </MainContent>
  );
}
