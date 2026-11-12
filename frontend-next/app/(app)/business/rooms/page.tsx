'use client';
import { Suspense } from 'react';
import BusinessRooms from '@/views/BusinessRooms';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BusinessRooms />
    </Suspense>
  );
}
