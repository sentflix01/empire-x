'use client';
import { Suspense } from 'react';
import Profile from '@/views/Profile';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Profile />
    </Suspense>
  );
}

