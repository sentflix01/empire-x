import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import GoogleSignInInit from '@/components/GoogleSignInInit';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'Halehame 👑',
    template: '%s | Halehame',
  },
  description: 'African superapp — social networking, business showrooms, marketplace, messaging, and task services.',
  keywords: ['Ethiopia', 'Africa', 'superapp', 'marketplace', 'social', 'business'],
  authors: [{ name: 'Halehame' }],
  creator: 'Halehame',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://halehame.app',
    siteName: 'Halehame',
    title: 'Halehame 👑 — Africa\'s Superapp',
    description: 'Social networking, business showrooms, marketplace, messaging, and task services.',
    images: ['/brand/empire-x-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Halehame 👑',
    description: 'Africa\'s Superapp — Social · Commerce · Services',
    images: ['/brand/empire-x-logo.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
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
        <GoogleSignInInit />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
