'use client';
import { Suspense } from 'react';
import Search from '@/views/Search';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Search />
    </Suspense>
  );
}

