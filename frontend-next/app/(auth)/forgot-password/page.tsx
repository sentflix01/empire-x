'use client';
import { Suspense } from 'react';
import ForgotPassword from '@/views/ForgotPassword';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ForgotPassword />
    </Suspense>
  );
}
