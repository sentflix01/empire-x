import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import GoogleSignInInit from '@/components/GoogleSignInInit';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'),
  title: {
    default: 'Nodbusiness 👑',
    template: '%s | Nodbusiness',
  },
  description: 'Build a guided online showroom for your local business, connect with customers, and manage product orders in one place.',
  keywords: ['local business', 'marketplace', 'showroom', 'products', 'orders', 'ecommerce'],
  authors: [{ name: 'Nodbusiness' }],
  creator: 'Nodbusiness',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://nodbusiness.app',
    siteName: 'Nodbusiness',
    title: 'Nodbusiness 👑 — Africa\'s Superapp',
    description: 'Guided business showrooms, local product discovery, ordering, and customer connections.',
    images: ['/brand/nodbusiness-logo.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nodbusiness 👑',
    description: 'Africa\'s Superapp — Social · Commerce · Services',
    images: ['/brand/nodbusiness-logo.svg'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/nodbusiness-icon copy.svg',
    shortcut: '/icons/nodbusiness-icon copy.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover', // enables safe-area-inset on iPhone notch/home bar
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning // needed for next-themes dark mode
    >
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>
        <GoogleSignInInit />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
