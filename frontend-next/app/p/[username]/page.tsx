'use client';
import { Suspense } from 'react';
import Profile from '@/views/Profile';
import MainContent from '@/components/layout/MainContent';

export default function Page() {
  return (
    <MainContent>
      <Suspense fallback={null}>
        <Profile />
      </Suspense>
    </MainContent>
  );
}

