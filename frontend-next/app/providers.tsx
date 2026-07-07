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
import { makeQueryClient } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import { Toaster } from '@/components/ui/toaster';
import AiAssistant from '@/components/AiAssistant';

export default function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures the QueryClient is created once per component instance
  // and not recreated on every render
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <CartProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <AiAssistant />
            <Toaster />
          </QueryClientProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
