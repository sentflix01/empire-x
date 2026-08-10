'use client';
/**
 * App layout — authenticated pages with sidebar + header.
 * Wraps authenticated app routes with the shared AppLayout.
 */
import AppLayout from '@/components/layout/AppLayout';
import { RealModeProvider } from '@/lib/RealModeContext';
import { ProfileViewProvider } from '@/lib/ProfileViewContext';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealModeProvider>
      <ProfileViewProvider>
        <AppLayout>{children}</AppLayout>
      </ProfileViewProvider>
    </RealModeProvider>
  );
}
