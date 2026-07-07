'use client';
import { Suspense } from 'react';
import BusinessAnalytics from '@/views/BusinessAnalytics';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BusinessAnalytics />
    </Suspense>
  );
}

