import type { Metadata } from 'next';

// A page title of its own and a canonical address (new-user audit NU-14);
// the page itself is a client component, so the metadata lives here.
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Nodbusiness with your password, an emailed code or Google.',
  alternates: { canonical: '/login' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
