'use client';
/**
 * App layout — authenticated pages with sidebar + header.
 * Wraps authenticated app routes with the shared AppLayout.
 */
import AppLayout from '@/components/layout/AppLayout';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
