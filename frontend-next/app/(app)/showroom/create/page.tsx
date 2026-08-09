'use client';
import { Suspense } from 'react';
import ShowroomWizard from '@/views/ShowroomWizard';

export default function ShowroomCreatePage() {
  return (
    <Suspense fallback={null}>
      <ShowroomWizard />
    </Suspense>
  );
}
