'use client';
import { Suspense } from 'react';
import ServiceAgreementPage from '@/views/ServiceAgreement';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ServiceAgreementPage />
    </Suspense>
  );
}
