import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import GoogleSignInInit from '@/components/GoogleSignInInit';

// Load Inter via next/font so the --font-body CSS variable is backed by a
// real font file. Without this import the browser silently falls back to
// ui-sans-serif (system font) even though Inter is declared in globals.css.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'),
  title: {
    default: 'Nodbusiness',
    template: '%s | Nodbusiness',
  },
  description: 'Build a guided online showroom for your local business, connect with customers, and manage product orders in one place.',
  keywords: ['local business', 'marketplace', 'showroom', 'products', 'orders', 'ecommerce'],
  authors: [{ name: 'Nodbusiness' }],
  creator: 'Nodbusiness',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://nodbusiness.vercel.app',
    siteName: 'Nodbusiness',
    title: 'Nodbusiness — Africa\'s Superapp',
    description: 'Guided business showrooms, local product discovery, ordering, and customer connections.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: "Nodbusiness — Africa's Superapp" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nodbusiness',
    description: 'Africa\'s Superapp — Social · Commerce · Services',
    images: ['/opengraph-image'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/nodbusiness-icon.svg',
    shortcut: '/icons/nodbusiness-icon.svg',
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
      data-scroll-behavior="smooth"
      suppressHydrationWarning // needed for next-themes dark mode
      className={inter.variable}
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
