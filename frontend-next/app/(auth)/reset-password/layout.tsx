import type { Metadata } from 'next';

// A page title of its own and a canonical address (new-user audit NU-14);
// the page itself is a client component, so the metadata lives here.
export const metadata: Metadata = {
  title: 'Choose a new password',
  alternates: { canonical: '/reset-password' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
