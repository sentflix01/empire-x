'use client';
import { Suspense } from 'react';
import ShowroomCreate from '@/views/ShowroomCreate';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ShowroomCreate />
    </Suspense>
  );
}

