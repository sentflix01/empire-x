'use client';
/**
 * App layout — authenticated pages with sidebar + header.
 * Wraps authenticated app routes with the shared AppLayout.
 */
import AppLayout from '@/components/layout/AppLayout';
import { RealModeProvider } from '@/lib/RealModeContext';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealModeProvider>
      <AppLayout>{children}</AppLayout>
    </RealModeProvider>
  );
}
