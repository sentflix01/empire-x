'use client';

/**
 * providers.tsx — All client-side context providers in one place.
 *
 * In Next.js App Router, context providers must be in a 'use client' component.
 * This file wraps all providers so the root layout stays a Server Component.
 */
import React, { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { makeQueryClient } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import AiAssistant from '@/components/AiAssistant';
import GlobalErrorReporter from '@/components/GlobalErrorReporter';
import { initSentry } from '@/lib/sentry';
// Initialize i18n — must be imported here so it runs before any component renders
import i18n from '@/lib/i18n';

export default function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures the QueryClient is created once per component instance
  // and not recreated on every render
  const [queryClient] = useState(() => makeQueryClient());

  // Initialize Sentry once on mount (no-ops when DSN is absent)
  React.useEffect(() => { initSentry(); }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <CartProvider>
            <QueryClientProvider client={queryClient}>
              {/* Global error reporter — captures window.onerror + unhandledrejection */}
              {/* Reports to DevOps Live Error Feed in real time */}
              <GlobalErrorReporter />
              {children}
              <AiAssistant />
              <Toaster />
              {/* Views call toast() from 'sonner'; without this container none of those messages appear. */}
              <SonnerToaster richColors closeButton />

            </QueryClientProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
